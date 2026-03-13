# AirSync Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Initial Version] - 2025-10-06

Initial release of AirSync extension for Raycast.

### Added

#### Core Features
- **Show Status** - View detailed device information including IP, port, ADB status, notification count, and device version
- **Disconnect Device** - No-view command to quickly disconnect with HUD feedback
- **Reconnect Device** - No-view command to reconnect with HUD feedback

#### Notifications
- **View Notifications** - Browse all notifications with app icons in a two-row layout
- **Reply to Notifications** - Interactive reply form for notifications with reply actions
- **Notification Actions** - Execute button actions (Mark as Read, etc.)
- **Dismiss Notifications** - Remove notifications with ⌘D keyboard shortcut
- Full-width detail view for better readability
- Copy notification content support

#### Media Controls
- **Media Player View** - Display track info, artist, and album art
- **Interactive Playback Controls**:
  - Play/Pause toggle (⌘⇧P)
  - Next track (⌘⇧N)
  - Previous track (⌘⇧B)
  - Like/Unlike track (⌘⇧L)
- Volume bar visualization
- Auto-refresh after control actions
- Copy track information support

#### Mirroring Features
- **Android Mirror** - Launch full device mirroring
- **Desktop Mode** - Launch desktop mode mirroring (Android 15+)
- **Mirror App** - Browse and select specific apps to mirror
  - App list with icons
  - Filter by system/user apps
  - Show notification listening status
  - Connect ADB directly from the view (⌘A)
- **Connect ADB** - Standalone command to connect via ADB
  - Detailed error messages and installation instructions
  - Support for various connection states

#### Technical Features
- Base64 image support for app icons and album art
- JSON response parsing with error handling
- AppleScript integration for all AirSync commands
- No-view commands with HUD/Toast notifications
- Keyboard shortcuts for quick actions
- Auto-refresh mechanisms for dynamic content
- Error handling with user-friendly messages

### Technical Details
- Built with TypeScript and React
- Uses Raycast API v1.79.0+
- Integrates with AirSync macOS app via AppleScript
- 9 total commands (5 view, 4 no-view)
- Comprehensive error handling and user feedback

[1.0.0]: https://github.com/sameerasw/airsync-raycast/releases/tag/v1.0.0
