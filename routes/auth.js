var express = require('express');
var passport = require('passport');
var db = require('../db');

var router = express.Router();

router.get('/login', function(req, res, next) {
  res.render('login');
});

router.get('/login/federated/accounts.google.com', passport.authenticate('google'));

router.get('/oauth2/redirect/accounts.google.com',
  passport.authenticate('google', { assignProperty: 'federatedUser', failureRedirect: '/login' }),
  function(req, res, next) {
    db.get('SELECT * FROM federated_credentials WHERE provider = ? AND subject = ?', [
      'https://accounts.google.com',
      req.federatedUser.id
    ], function(err, row) {
      if (err) { return next(err); }
      if (!row) {
        db.run('INSERT INTO users (name) VALUES (?)', [
          req.federatedUser.displayName
        ], function(err) {
          if (err) { return next(err); }
          
          var id = this.lastID;
          db.run('INSERT INTO federated_credentials (provider, subject, user_id) VALUES (?, ?, ?)', [
            'https://accounts.google.com',
            req.federatedUser.id,
            id
          ], function(err) {
            if (err) { return next(err); }
            var user = {
              id: id.toString(),
              displayName: req.federatedUser.displayName
            };
            req.login(user, function(err) {
              if (err) { return next(err); }
              res.redirect('/');
            });
          });
        });
      } else {
        db.get('SELECT rowid AS id, username, name FROM users WHERE rowid = ?', [ row.user_id ], function(err, row) {
          if (err) { return next(err); }
    
          // TODO: Handle undefined row.
          var user = {
            id: row.id.toString(),
            username: row.username,
            displayName: row.name
          };
          req.login(user, function(err) {
            if (err) { return next(err); }
            res.redirect('/');
          });
        });
      }
    });
    
  });

router.get('/logout', function(req, res, next) {
  req.logout();
  res.redirect('/');
});

module.exports = router;
