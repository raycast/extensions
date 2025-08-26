# Start Time Tracking From Email Thread Changelog

## [1.1.0] - 2024-12-19

### Added
- **BrowserExtension API support**: Added support for browsers that don't support AppleScript (like Dia, Firefox)
- **Multi-method fallback**: Extension now tries BrowserExtension API first, then falls back to AppleScript
- **Better error messages**: More specific error messages for different browsers and scenarios
- **Enhanced browser detection**: Improved detection of various browsers including Dia

### Changed
- **Improved reliability**: Extension now works with any browser that has the Raycast Browser Extension installed
- **Better user feedback**: More informative error messages and success notifications
- **Updated documentation**: Added browser support information and troubleshooting guide

### Fixed
- **Dia browser compatibility**: Extension now works with Dia browser when Browser Extension is installed
- **Firefox compatibility**: Better support for Firefox and other non-AppleScript browsers

## [Initial Version] - {PR_MERGE_DATE}