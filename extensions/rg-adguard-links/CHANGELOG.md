# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-14

### Added
- Initial release of RG AdGuard Links extension
- Convert Microsoft Store URLs to rg-adguard.net download links
- Proper API integration with POST requests to rg-adguard.net
- Parse and display all available download files
- Support for multiple Microsoft Store URL formats
- Product ID extraction from various URL patterns
- List view showing all available downloads
- Actions to open downloads in browser
- Action to copy download URLs to clipboard
- Support for direct product ID input (without full URL)
- Form-based input interface
- Error handling for invalid URLs and failed API requests
- Toast notifications for user feedback

### Technical Details
- Built with TypeScript and React
- Uses Raycast API v1.83.2
- Implements proper form validation
- HTML parsing for download link extraction
- Support for x64, x86, ARM64 architectures
- Handles .appx, .msix, .appxbundle file formats

## [Unreleased]

### Planned Features
- File size information display
- App metadata (name, version, publisher)
- Download history tracking
- Favorite apps bookmarking
- Batch URL conversion
- Integration with download managers
- Screenshots for Raycast Store submission

---

For more information about this extension, visit the [README](README.md).
