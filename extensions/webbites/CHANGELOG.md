# Webbites Raycast Extension Changelog

## [Improvement] - 2025-10-06

- Fixed bug where the user could not login due to a typo.
- Added analytics for tracking usage. All that is collected is when a user opens the extension, no other data is collected.

## [Initial Version] - 2025-09-22

### Added

- Search WebBites bookmarks functionality
- Save URLs and text notes to WebBites
- Dual view modes (grid and list)
- Authentication with WebBites account
- Secure credential management via preferences

### Security

- Moved hardcoded credentials to secure preferences
- Removed auto-login behavior
- Implemented proper error handling for missing credentials
