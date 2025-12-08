# Test Changelog

## [Send Email from Alias & Improvements] - 2025-12-08

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

## [Initial Version] - {PR_MERGE_DATE}