# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2025-11-25

- Added Windows as a supported platform in package.json
- Refactored code to clean up and abstract code

## [1.0.0] - 2025-11-24

### Added

- Initial release of RG AdGuard Links extension
- Convert Microsoft Store URLs to rg-adguard.net download links
- Proper API integration with POST requests to rg-adguard.net
- Parse and display all available download files with file sizes
- Display app metadata (name, version, product ID)
- Architecture detection and labeling (x64, x86, ARM64)
- Support for multiple Microsoft Store URL formats
- Product ID extraction from various URL patterns
- Two-section list view (App Information + Available Downloads)
- Actions to open downloads in browser
- Action to copy download URLs to clipboard
- Action to copy filenames to clipboard
- Keyboard shortcuts (⌘+C, ⌘+Shift+C, ⌘+B)
- Support for direct product ID input (without full URL)
- Form-based input interface with description
- Error handling with showFailureToast from @raycast/utils
- Toast notifications for user feedback
- File size parsing and formatting (KB, MB, GB)

### Technical Details

- Built with TypeScript and React
- Uses Raycast API v1.83.2 and @raycast/utils v1.17.0
- Implements proper form validation
- HTML parsing for download link extraction with regex
- File size extraction and formatting
- App metadata extraction from HTML response
- Support for x64, x86, ARM64 architecture detection
- Handles .appx, .msix, .appxbundle, .eappx, .emsix file formats
- Uses showFailureToast for consistent error handling

## Roadmap

### Planned Features

- Download history tracking
- Favorite apps bookmarking
- Batch URL conversion
- File type filtering
- Integration with download managers

---

For more information about this extension, visit the [README](README.md).
