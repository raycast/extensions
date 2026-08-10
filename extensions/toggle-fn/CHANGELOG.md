# Toggle Fn Changelog

All notable changes to this project will be documented in this file.

## [1.0.2] - 2026-02-25

### Added

- Support for macOS Tahoe (26.x)

### Fixed

- Critical bug: Corrected application name from "System Settings" to "System Preferences" in macOS < 13.0 branch, preventing crashes on Big Sur and Monterey

### Improved

- Significant performance boost on macOS 26+ by using `activateSettings` command instead of UI scripting
- Settings now take effect immediately without UI automation delays
- Better user feedback with specific HUD messages for Standard F-Keys vs Media Controls

### Changed

- Optimized AppleScript logic to use direct `defaults` commands on newer macOS versions

## [1.0.1] - 2025-10-13

### Fixed

- Resolved an issue where the extension would not run
 
## [1.0.0] - 2024-08-25

### Added

- Initial version code
