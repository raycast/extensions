# FineTune Changelog

## [Initial Version] - {PR_MERGE_DATE}

### Added

- **Control App Volume** command for monitoring active audio apps, adjusting per-app volume, and managing FineTune routing targets.
- **Toggle FineTune** no-view command for enabling or disabling FineTune processing while preserving prior per-app settings for later restore.
- **Set Default Output Device (FineTune)** command for quickly switching the macOS default output device from Raycast.

### Features

- Native CoreAudio device enumeration and default-output switching.
- AppleScript-based per-app volume control for supported media and browser apps, including boost presets where available.
- FineTune app integration for per-app routing and restore-on-toggle behavior.
- Automatic refresh of running audio apps, playback state, volume, and route status inside the main command.
