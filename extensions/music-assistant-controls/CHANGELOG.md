# Music Assistant Controls Changelog

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
