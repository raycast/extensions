# @ Profile Changelog

## [Prevent Infinite Loop in Open Profile and add Screenshots] - 2025-08-08

### Added

- **Screenshots**: Added screenshots to for Raycast Store

### Fixed

- **Infinite Loop**: Fixed infinite loop in Open Profile

### Changed

- **Raycast API**: Updated Raycast API to v1.102.3

## [Profile History and Custom Apps] - 2025-08-07

### Added

- **New "Open Profile" Command**: Open a profile from a dynamic list of Apps, or choose from a handy list of recent profiles
- **New "History" Command**: Displays a list of recently opened profiles filterable by App
- **New "Manage Apps" Command**: Allows users to enable and disable apps or add custom apps
- **Import/Export**: Allows users to import and export their settings, history, and profile history

### Changed

- Updated "Quick Profile" Command to use editable list of Apps in `./src/utils/default-apps.ts`

## [Enhanced Platform Management] - 2025-01-07

### Added

- **New "Manage Apps" Command**: Renamed and enhanced platform management interface
- Dynamic platform loading - no more hardcoded dropdown values
- Real-time platform status updates with enable/disable functionality
- Comprehensive YAML import/export for settings backup and sharing
- Enhanced documentation with screenshots and feature explanations

### Changed

- Improved app management interface with better organization
- Improved user interface with clearer section titles
- Updated README with comprehensive feature documentation

## [Fixes] - 2025-05-12

- Fixed Twitter and X to lead to X [#18534](https://github.com/raycast/extensions/issues/18534)

## [Add AI Tool] - 2025-03-10

This release adds the AI functionality and TikTok as site option.

## [Initial Version] - 2024-08-13
