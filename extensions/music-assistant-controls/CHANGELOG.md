# Music Assistant Controls Changelog

## [Big update with many features] - 2026-02-27

### ✨ New Features

- **Individual member volume adjustment** - Control volume of each speaker independently within a player group
  - **Volume display** - See current volume level of each group member in the Manage Player Groups command
  - **Group volume** - Volume commands control the group level when applicable
  - **Fine-grained adjustments** - Individual volume control in the player groups command
  - **Sync Members with Leader** - Synchronize all group member volumes to the leader's level
  - **Real-time feedback** - Volume changes provide immediate confirmation toast notifications
- **Current Track command** - View now-playing track with large album artwork and detailed metadata
  - **Shuffle toggle** - Quick button to toggle shuffle mode (OFF ↔ ON) with visual feedback
  - **Repeat mode cycling** - Cycle through repeat modes (OFF → ONE → ALL → OFF) with status display
  - **Favorites toggle** - One-click button now adds or removes the current track from favorites based on current status
  - **Add to Playlist** - Dropdown menu to select from available playlists and add current track instantly
  - **Track metadata display** - Shows track title, artist, album, duration, queue name, and player state
- **Mute Toggle Command** - Dedicated command to toggle mute state on the active player with visual feedback showing state changes (MUTED/UNMUTED)
- **Music Library Hub Command** - Comprehensive library exploration with unified search, browse, and queue management
  - **Search** - Full-text search across entire library (artists, albums, tracks, playlists) with 50-item limit
  - **Browse Tab** - Drill-down navigation through Artists, Albums, and Playlists with pagination
  - **Recently Played Tab** - Quick access to 30 recently played items
  - **Queue Manager Tab** - View, reorder, remove, or clear items from active queue
  - **Queue Controls** - Manage shuffle and repeat modes directly from queue manager
  - **Add to Queue** - All items can be added to active player's queue to play next
- **Previous Song command** - Navigate backward through the queue with a dedicated "Previous Song" command that mirrors the existing "Next Song" functionality

### 🎨 UI/UX Enhancements

- **Member volume indicators** - Manage Player Groups displays each member's volume percentage in the subtitle with fine-grained controls
- **Leader volume controls** - Group leaders get sophisticated volume management with group-wide and individual member controls
- **Set Active Player command** - Now shows all available players organized by groups and standalone players
  - Filters to show only controllable players (standalone players and group leaders)
  - Group leaders display member count in subtitle
  - Shows currently playing track or player status
- **Intuitive controls** - Keyboard shortcuts (Cmd/Ctrl + = and Cmd/Ctrl + −) for quick volume balancing across grouped speakers
- **Set Volume pre-fills current level** - Volume form now displays the current volume (group or individual) instead of always showing 50

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
