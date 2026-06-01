# Switch Tabs Changelog

## [Initial Release] - {PR_MERGE_DATE}

### Commands
- **Switch Tabs** — instantly jump to any open tab across all connected browsers and windows
- **Manage Server** — run setup scripts, watch live WebSocket logs, and import Edge workspaces from inside Raycast

### Tab Management
- Switch to any tab, open in background, close, pin/unpin, refresh, discard (freeze), duplicate, and rename tabs
- Rename persists across SPA navigations on the same domain and auto-clears on domain change
- Move tabs to a different window or detach into a new window
- Toggle Focus Mode — detach a tab into a popup window or re-attach a popup back to the main window
- Toggle fullscreen per tab
- Minimize / restore browser windows
- Close entire windows

### Tab Groups
- View all tab groups with color labels
- Create new groups from any tab with a custom name and color
- Move tabs into existing groups, ungroup tabs
- Edit group name and color
- Collapsed view — browse all groups as folders, expand any group to see its tabs

### Web Search
- Toggle between Filter Tabs and Web Search mode with a single key (`/` by default)
- Live Google search suggestions
- Open results in a new tab, current tab, background tab, or a popup window
- "I'm Feeling Lucky" support (Google or DuckDuckGo)
- Set a suggestion as the search query without opening it
- Surgical search targeting — scan the active tab for input fields and inject a query directly

### Bookmarks
- Browse the full bookmark tree
- Open bookmarks in a new or current tab
- Create a bookmark from any open tab into a chosen folder
- Move, rename, and delete bookmarks

### History
- Browse recent browser history grouped by date
- Open entries in a new tab, current tab, or background
- Delete individual history items

### Downloads
- View all downloads with live progress bars for active downloads
- Pause, resume, and cancel in-progress downloads
- Erase download history entries
- Open completed files, show in folder, open with, quick look, rename

### Sessions (Recently Closed)
- Browse recently closed tabs and windows grouped by date
- Restore any closed session in a new tab, current tab, or background

### Workspaces (Edge)
- Browse Edge workspace tab groups
- Import workspace configurations from Edge sync exports
- Workspace names sync via native messaging even when the WebSocket is offline

### Media Controls
- Play / pause media in any tab
- Seek forward and backward (5 seconds, debounced — rapid presses accumulate into one combined seek)
- Increase / decrease playback speed
- Real-time media badge showing current time, duration, and playback speed

### Multi-Browser Support
- Connects to multiple Chromium browsers simultaneously (Edge, Chrome, Brave, Helium)
- Cycle through connected browsers with a hotkey
- Per-browser window filter with smart window naming
- Manual browser type override via the extension popup

### Preferences & Shortcuts
- Every action shortcut is fully configurable (modifier + key) via Extension Preferences
- Configurable tab icon and color for pinned, sleeping, and discarded tabs
- Window filter dropdown with smart naming, optional "All Windows" view, and domain grouping
- Search behavior options — open in background, clear on enter, clear on current tab, clear on background
- All copy actions use `clip.exe` — instant clipboard write, Raycast window stays open
