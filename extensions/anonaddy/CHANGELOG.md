# Addy Changelog

## [Self-hosted Support] - 2026-01-15

### Added
- Support for self-hosted Addy instances via the Custom URL preference

## [Send Email from Alias & Improvements] - 2025-12-09

### Added
- New "Send an Email from an Alias" command to compose sender addresses for Addy aliases
- Auto-detection of recipient email from selected text
- Response caching for domain options and recipients endpoints (5-minute TTL)
- Generic type support to API fetch wrapper
- Centralized error handling utility

### Changed
- Upgraded `@raycast/api` from 1.94.0 to 1.100.3
- Upgraded `@raycast/utils` from 1.19.1 to 2.0.1
- Migrated ESLint configuration from `.js` to `.mjs` with enhanced import ordering rules
- Renamed `APIError` to `AddyError` with improved status tracking
- Refactored API methods to reduce code duplication

### Improved
- Better TypeScript type safety across API interactions
- Enhanced error handling with status code tracking
- Automatic JSON response parsing in fetch wrapper

## [Feature] - 2025-03-20
- Added support for creating custom aliases through a form.
- Improved alias management with list and detail views.

## [Enhancements] - 2023-12-12
- Updated API endpoint to `https://app.addy.io/api/v1`
- Fixed a bug where `anonaddy.me` was used by default. Now default domain selected in Addy is used.

## [Initial Version] - 2022-09-26
