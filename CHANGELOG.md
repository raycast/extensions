# Brightness Control Changelog

## [Unreleased]

### Added
- Multi-display support with automatic cursor-based detection
- Display selector dropdown for manual display switching
- Comprehensive retry logic with exponential backoff for all operations
- Brightness change verification to ensure changes are applied
- Better error handling and user feedback
- Display names shown in UI (e.g., "Built-in (Main)", "AirPlay Display")

### Improved
- Robust JSON parsing for Lunar CLI output
- More reliable display detection on extension startup
- Validation of all Lunar CLI operations
- Fallback to main display if cursor detection fails

### Known Issues
- When activated from the main display, brightness changes may occasionally affect both the main display and AirPlay displays simultaneously due to Lunar sync settings. This is a Lunar behavior and can be configured in Lunar's sync settings.

## [Initial Version] - {PR_MERGE_DATE}

- Initial release with Set Brightness command
- Displays current brightness before setting new value
- Shows brightness change (old → new) in HUD notification
- Auto-detects and guides Lunar installation
- One-click Lunar CLI installation if app is present
- Works with all Mac displays including XDR/Liquid Retina via Lunar CLI
