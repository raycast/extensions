# Luxafor Changelog

## [1.1.0] - 2026-11-05

- Add Set Busy, Set Available, Turn off and Set Custom Color commands, plus five recent accepted colors.
- Fix red-test cancellation and validate custom hex colors before sending.
- Replace inferred online/device status with API request history; opening and refreshing never change the light.
- Remove automatic health polling and blink restoration. Check the light before resending an uncertain request.
- Prevent overlapping commands, retain accepted history on failure and preserve useful legacy saved choices.
- Mask the existing User ID preference without renaming it. macOS remains the supported platform.
- Rename Luxafor Menu Bar Status to Luxafor Menu Bar while retaining its command key.
- Keep preferences as the secondary control action, show Refresh History with ⌘R and confirm local history clearing.

## [1.0.0] - 2025-08-26

### Added
- Initial public release of Luxafor Controller
- Main control interface with full color options
- Menubar integration with real-time status monitoring
- Global state management for consistent UI state
- Connection testing and health monitoring
- Support for 7 basic colors (red, green, blue, yellow, cyan, magenta, white)
- Blink effects for all colors
- Smart auto-refresh that preserves user actions
- API endpoint selection (US/UK)
- Debug mode for development and troubleshooting
- Comprehensive error handling and user feedback
- (placeholder) Add new entries here for the next release