# Claude Code Changelog

## [1.1.0] - Unreleased

### Changed
- Renamed extension from "Claude Code Opener" to "Claude Code" for cleaner branding
- Updated command title from "Open with Claude Code" to "Open Project"
- Improved terminal adapter architecture to be more modular and extensible

### Added
- Form validation for adding/editing favorites:
  - Path existence and accessibility checks
  - Duplicate path prevention
  - Character limit (100) for project names
- Runtime dependency validation:
  - Checks Claude binary exists and is executable on launch
  - Verifies terminal application availability
  - Shows helpful error messages with resolution steps
- Enhanced error handling:
  - Graceful handling of corrupted favorites data
  - Better disk permission error messages
  - Validation for all user inputs

### Fixed
- ESLint warnings for unused variables
- Improved error messages for better user guidance

## [1.0.0] - Initial Release

### Features
- Save and manage favorite project directories
- Quick fuzzy search across all projects
- Smart sorting by recency and usage frequency
- Custom names and icons for projects
- Support for Terminal.app and Alacritty
- Keyboard shortcuts for all common actions
- Path validation and error handling