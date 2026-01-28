# Brightness Control Changelog

## [Initial Version] - {PR_MERGE_DATE}

### Added
- Multi-display support with automatic cursor-based detection
- Display selector dropdown for manual display switching
- Comprehensive retry logic with exponential backoff for all operations
- Brightness change verification to ensure changes are applied
- Better error handling and user feedback
- Display names shown in UI (e.g., "Built-in (Main)", "AirPlay Display")
- Set Brightness command to control display brightness
- Max Brightness command for quick access to maximum brightness
- Current brightness display before setting new value
- Brightness change (old → new) shown in HUD notification
- Auto-detection and guided Lunar installation
- One-click Lunar CLI installation if Lunar app is present

### Improved
- Robust JSON parsing for Lunar CLI output
- More reliable display detection on extension startup
- Validation of all Lunar CLI operations
- Fallback to main display if cursor detection fails

### Known Issues
- When activated from the main display, brightness changes may occasionally affect both the main display and AirPlay displays simultaneously due to Lunar sync settings. This is a Lunar behavior and can be configured in Lunar's sync settings.
