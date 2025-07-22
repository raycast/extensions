# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-22

### Added

- 6 instant paste commands for direct clipboard access
- `paste-current` - Paste current clipboard item (position 0)
- `paste-first` - Paste 1st previous clipboard item (position 1)
- `paste-second` - Paste 2nd previous clipboard item (position 2)
- `paste-third` - Paste 3rd previous clipboard item (position 3)
- `paste-fourth` - Paste 4th previous clipboard item (position 4)
- `paste-fifth` - Paste 5th previous clipboard item (position 5)
- No-view mode for instant execution without UI
- Comprehensive error handling for empty clipboard positions
- HUD notifications with content preview
- Support for Unicode and special characters
- Graceful handling of clipboard access failures

### Features

- Direct clipboard access without modification
- Keyboard shortcut friendly design
- Visual feedback with success/error messages
- Content preview in notifications (truncated for long text)
- Robust error handling and user feedback
- TypeScript implementation with strict type checking
- Comprehensive test suite with 100% coverage goal

### Technical Implementation

- Built with Raycast API v1.101.1
- TypeScript with strict mode enabled
- ESLint configuration for code quality
- Prettier for consistent code formatting
- Jest testing framework
- Comprehensive error boundaries
- Performance optimized for instant execution
