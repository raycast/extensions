# Music Assistant Controls Changelog

## [Player Grouping and Menu Bar Management] - 2026-02-24

### ✨ New Features

- **Manage player groups command** - Tree-view interface to create, modify, and disband player sync groups
- **Group members in menu bar** - See and manage group members directly from the menu bar with add (+) and remove (−) actions
- **Playback state indicators** - Visual play/pause icons showing player status
- **Context-aware actions** - Action menus adapt based on player status (standalone, member, or leader)

### 🎨 UI/UX Enhancements

- **Album art display** - See album covers across all commands with rounded icons next to player names and song titles:
  - Menu bar shows album art for active and inactive players
  - Set Active Player command displays album art for each available player
  - Manage Player Groups command shows album art for group leaders and standalone players
- **Streamlined menu bar layout** - Active player section at top with other players listed below for quick switching

## [Windows Support Added] - 2026-02-24

### ✨ New Features

- **Cross-Platform Availability** - Extension is now available on both macOS and Windows Raycast.

### 📝 Platform Support Notes

- All commands (Toggle, Next Song, Volume Up/Down, Set Volume, Set Active Player) are available on Windows
- Menu bar command is macOS-only as the feature isn't supported on Windows Raycast

## [Volume Step Controls] - 2026-02-23

### ✨ New Features

- **Volume Up/Down Commands** - Increase or decrease volume on the active player using Music Assistant's native step controls
- **Toast Feedback** - All no-view commands now provide feedback including volume transitions and the current playing song

### 🎯 Benefits

- Quick volume adjustment without opening the menu bar
- Bind to media control keys for optimal experience

## [REST API Migration] - 2026-01-30

### 🔧 Technical Improvements

- **Migrated from WebSocket to REST API** - Switched to Music Assistant's REST API for simpler and more reliable communication
- **Improved Reliability** - No more connection state management or reconnection logic issues
- **Performance Optimization** - Fixed menu bar timeout issues by memoizing client instance

### 📝 Documentation

- **Simplified Setup** - Removed instructions for exposing port 8095 in Home Assistant add-on, as it's now enabled by default

## [Update for breaking changes in Music Assistant API] - 2025-12-28

### ✅ Compatibility

- You can now paste your Music Assistant long-lived token in preferences so the extension signs in automatically.
- Works again with the latest Music Assistant release — playback controls, queue actions, and player commands no longer fail with auth errors.

### 🧠 Reliability

- Loads players, queues, and providers immediately after connecting so the menu bar and commands always have up-to-date data.
- Menu bar command refreshes more often, so state should match the current song a lot more accurately.
- Paused song no longer perpetually displayed in the menu bar, only in the dropdown.

## [Volume Control Features] - 2025-09-12

### ✨ New Features

- **Volume Control in Menu Bar**: Control volume directly from the menu bar with current level display and quick presets (Mute, 25%, 50%, 75%, 100%)
- **Set Volume Command**: New command for precise volume control with text input
- **Smart Volume Detection**: Volume controls only appear for players that support them

### 🎨 UI/UX Enhancements

- Visual volume indicators with speaker icons and mute status
- Real-time volume updates across the interface
- Seamless integration with existing playback controls

## [Initial Version] - 2025-09-03
