# Radicle Changelog

## [Fix URL nodes param] - 2024-03-01

- Instead of passing only the hostname, we need to make sure to pass in hostname and port into the URL, when opening the repo in the browser.

## [Added `show` param to project listing] - 2024-02-03

- Increase `perPage` query variable to 500 overwriting the default value of 10 projects.
- Added `show` query param to project listing, to get all available projects instead of only the pinned ones.

## [Initial Version] - 2024-01-17

Initial version code
