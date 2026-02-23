# Music Assistant Controls Changelog

## [Menu Bar Enhancements for Group Management] - {PR_MERGE_DATE}

### ✨ New Features

- **Group Members Submenu** - See all members of the currently playing group directly in the menu bar without opening the full group management command
- **Quick Group Management** - Add or remove players from the group right in the menu bar:
  - Click the **minus icon (−)** next to group members to remove them
  - Click the **plus icon (+)** next to compatible players to add them to the group
- **Current Song Display for All Players** - View what's currently playing on each inactive player with song titles displayed as subtitles
- **Smart Player Filtering** - Menu bar now intelligently shows only group leaders and standalone players, hiding group members that follow their leader's playback to reduce clutter

### 🎨 UI/UX Enhancements

- Build, modify, and manage groups directly from the menu bar without switching to the full command
- Unified group management interface showing both current members and available players to recruit
- Faster group creation and modifications for power users

## [Player Grouping and Ungrouping] - {PR_MERGE_DATE}

### ✨ New Features

- **Manage Player Groups Command** - Control player sync groups with an intuitive tree-view interface
- **Create New Groups** - Combine standalone players into new groups for synchronized playback
- **Join Existing Groups** - Add standalone players to existing groups with one click
- **Disband Groups** - Remove all members from a group to return them to standalone mode
- **Tree View UI** - Groups displayed as hierarchies with leaders and their nested members for clear relationships
- **Playback State Indicators** - Play/pause icons showing player status at a glance
- **Smart Formatting** - Group leaders show currently playing info; members show group status
- **Context-aware Actions** - Action menus adapt based on player status (standalone, member, or leader)

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
