# WHOOP Changelog

All notable changes to this project will be documented in this file.

## [1.0.3] - 2024-10-19

### Changed

- Authentication now uses OAuthService from Raycast utilities.
- Updated all dependencies to their latest compatible versions.

## [1.0.2] - 2024-01-18

### Changed

- Authentication now uses a PKCE proxy that Thomas Lombart kindly setup.

### Fixed

- Resolved the "TypeError: Cannot read properties of undefined" error.
- Resolved the "RangeError: Invalid time value" error.

## [1.0.1] - 2023-11-23

### Fixed

- Like biometrics, use Today, Yesterday, MMM d. date formats for workout list.
- Remove @typescript-eslint/no-explicit-any errors by casting to api.defaults.fetch.

## [Initial Version] - 2023-11-23
