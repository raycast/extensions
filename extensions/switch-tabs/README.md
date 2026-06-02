# Switch Tabs

A [Raycast](https://raycast.com) extension for Windows that gives you instant keyboard-driven control over every open tab across all your Chromium browsers — switch, search, group, pin, close, control media, manage bookmarks, browse history, track downloads, and more.

> **Requires the companion browser extension.**
> Install it from the companion repo: [switch-tabs-companion](https://github.com/ferrocyante/Manage-Server)

---

## How It Works

```
Raycast Extension  ←──WebSocket──→  Bridge Server (.exe)  ←──WebSocket──→  Browser Extension
```

The bridge server (`raycast-bridge-server.exe`) is a standalone background process that runs independently of any browser or Raycast session. It listens on port `19222` and relays messages between Raycast and your browser extension. The server runs until you explicitly stop it — it does not shut down when you close your browser or Raycast.

The server is downloaded automatically the first time you open **Manage Server**. No manual setup required.

---

## Setup

### 1. Install the Browser Extension

Go to [switch-tabs-companion](https://github.com/ferrocyante/Manage-Server) and follow the browser extension setup guide.

### 2. Open Manage Server

Open Raycast → type **Manage Server** → press Enter.

On first open, the extension downloads the bridge server automatically. A progress screen appears while this happens — it only takes a few seconds and only happens once.

### 3. Start the Server

Once setup is complete, press Enter on **Server Status** → select **Start Server**.

The server starts silently in the background. Enable **Start at Login** to have it start automatically every time Windows boots.

### 4. Open Switch Tabs

Open Raycast → type **Switch Tabs** → press Enter. Your tabs should appear within a second or two.

---

## Commands

| Command | Description |
|---------|-------------|
| **Switch Tabs** | Main command — search, filter, and act on all open tabs |
| **Manage Server** | Start/stop the server, toggle login startup, watch live logs, import workspaces |

---

## Features

### Tab Switching & Management
- Jump to any open tab across all connected browsers and windows
- Open tabs in the background without leaving Raycast
- Close individual tabs or entire windows
- Pin / unpin tabs
- Rename tabs with a custom local title (persists across SPA navigations on the same domain)
- Duplicate tabs
- Refresh tabs
- Discard (freeze/suspend) tabs to free memory
- Move tabs to a different window or a new window
- Preview a tab's content inline with a live snapshot

### Popup Tabs (Focus Mode)
- Detach any tab into a centered popup window via `Ctrl + O`
- Popup tabs stay visible in the main tab list — they are never hidden or moved to a separate window filter entry
- Popup tabs are indicated with a **Desktop icon badge** — blue if it's the most recently used popup, secondary color otherwise
- Popup tabs sort by recency just like normal tabs
- Re-attach a popup tab back to the main window with the same shortcut
- Popup windows open centered on your screen regardless of size
- Popup window dimensions are configurable in the Bridge Control panel
- Opening a search result in a popup (`Ctrl + O` in search mode) shows a confirmation toast

### Tab Groups
- View all tab groups with color labels
- Create new groups from any tab (with name and color)
- Move tabs into existing groups
- Ungroup tabs
- Edit group name and color
- Collapsed view: browse all groups as folders, expand any group to see its tabs

### Web Search (Search Mode)
- Toggle between **Filter Tabs** and **Web Search** mode with `/`
- Live Google search suggestions with optional rich entity images
- Open results in a new tab, current tab, background tab, or a popup window
- "I'm Feeling Lucky" (Google or DuckDuckGo)
- Surgical search targeting: scan the active tab for input fields and inject a query directly

### Bookmarks
- Browse the full bookmark tree
- Open bookmarks in a new or current tab
- Create a bookmark from any open tab into a chosen folder
- Move, rename, and delete bookmarks

### History
- Browse recent browser history
- Open entries in a new or current tab
- Delete individual items or all history

### Downloads
- View all downloads with live progress bars for active downloads
- Pause, resume, and cancel in-progress downloads
- Erase download history entries
- Open completed files

### Sessions (Recently Closed)
- Browse recently closed tabs and windows
- Restore any closed session

### Workspaces (Edge)
- Browse Edge workspace tab groups
- Import workspace configurations from Edge sync exports

### Media Controls
- Play / pause media in any tab
- Seek forward and backward
- Increase / decrease playback speed
- Real-time status badge showing current time, duration, and speed

### Multi-Browser
- Connects to multiple browsers simultaneously
- Cycle through connected browsers with a hotkey
- Per-browser window filter with smart window naming

### Window Management
- Filter tabs by window — popup windows are excluded from the filter (they appear inline in the list instead)
- Cycle through windows with a hotkey
- Close, minimize, restore windows
- Toggle fullscreen

---

## Keyboard Shortcuts

### Tab Actions

| Shortcut | Action |
|----------|--------|
| `Enter` | Switch to Tab *(configurable)* |
| `Ctrl + Shift + Enter` | Switch to Tab in Background |
| `Ctrl + →` | Preview Tab |
| `Shift + Enter` | Move Tab to Window (submenu) — popup windows excluded |
| `Ctrl + W` | Close Tab *(configurable)* |
| `Ctrl + X` | Close Window *(configurable)* |
| `Ctrl + M` | Minimize / Restore Window |
| `Ctrl + .` | Pin / Unpin Tab |
| `Ctrl + R` | Refresh Tab |
| `Ctrl + D` | Discard Tab (Freeze) |
| `Ctrl + E` | Rename Tab |
| `Ctrl + L` | Duplicate Tab |
| `Ctrl + O` | Detach to Popup / Re-Attach Tab |
| `Ctrl + F` | Toggle Fullscreen |
| `Shift + C` | Copy Tab URL |

### Tab Groups

| Shortcut | Action |
|----------|--------|
| `Ctrl + G` | Create New Group |
| `Shift + Z` | Move to Group (submenu) |
| `Shift + A` | Toggle Collapsed / Expanded view |
| `Ctrl + E` | Edit Group (name + color) — on a folder item |

### Media Controls

| Shortcut | Action |
|----------|--------|
| `Ctrl + ←` | Play / Pause Media |
| `→` | Seek Forward (5s) |
| `←` | Seek Backward (5s) |
| `Shift + .` | Increase Playback Speed |
| `Shift + ,` | Decrease Playback Speed |
| `Shift + →` | Search in Tab (when media is present) |
| `Shift + ←` | Input Search in Active Tab (when media is present) |

### Search Mode

| Shortcut | Action |
|----------|--------|
| `Enter` | Open in New Tab *(configurable)* |
| `Ctrl + Enter` | Open in Current Tab *(configurable)* |
| `Shift + Enter` | Open in Background |
| `Ctrl + O` | Open in Focus Popup |
| `Shift + S` | Set as Search Query |
| `Shift + C` | Copy URL |

### Navigation

| Shortcut | Action |
|----------|--------|
| `` ` `` | Cycle Browser Filter *(configurable)* |
| `Tab` | Cycle Window Filter *(configurable)* |
| `/` | Toggle Filter / Search Mode *(configurable)* |
| `'` | Clear Search / Filter Text *(configurable)* |
| `Ctrl + Space` | Open History View *(configurable)* |
| `Shift + Space` | Open Bookmarks View *(configurable)* |
| `Ctrl + Backspace` | Open Workspaces View *(configurable)* |
| `Shift + Tab` | Open Downloads View *(configurable)* |
| `Alt + X` | Open Sessions View *(configurable)* |

Every shortcut marked *(configurable)* can be changed in Extension Preferences.

---

## Bridge Control Panel

The browser extension has a settings popup (click the extension icon) with the following options:

### Popup Window Size
Set the width and height for popup windows created via Focus Mode or search. Choose from presets (Super Compact, Classic Card, Wide Banner, Large Premium) or enter custom dimensions. Popup windows always open centered on your screen.

### OS Focus & Desktop Switch
Fine-tune the window focus bounce delays for reliable virtual desktop switching on Windows:
- **Refocus Bounce** — delay between minimize and restore (default 10ms)
- **Minimized Wait** — pause before restoring a minimized window (default 100ms)
- **Focus Reinforce** — extra focus call after restore (default 50ms)

### Sync Limits
- **History Items** — max history entries synced to Raycast (default 100)
- **Recent Closed** — max recently closed sessions synced (default 25)

### New Tab Behavior
- **Normal** — allow all new tabs
- **Keep One** — maximum one new tab open at a time
- **Bombardment** — no new tabs survive (all closed immediately)

### Deep Scan Whitelist
Domains added here will have all frames scanned for tab content (useful for sites with iframes like Netflix). Add the current site with one click or enter a domain manually.

---

## Manage Server Command

The **Manage Server** command gives you full control over the bridge server:

| Item | What it does |
|------|-------------|
| **Server Status** | Shows Running/Stopped, number of connected browsers, and uptime. Actions: Start, Stop, Kill, Refresh |
| **Start at Login** | Enables/disables automatic server startup at Windows login via Registry run key |
| **Watch Bridge Logs** | Opens a terminal window with live color-coded WebSocket logs |
| **Import Edge Workspaces** | Imports Edge workspace tab configurations |
| **Clean Up Extension Data** | Removes all server files, workspace data, and Raycast cache. Requires confirmation. Returns to Raycast root when complete. |

---

## Preferences

### Search

| Preference | Default | Description |
|------------|---------|-------------|
| Open in Background | Off | Opening a result keeps Raycast open and doesn't focus the browser |
| Clear Search on Enter | Off | Pressing Enter on a web search result clears the search bar |
| Clear Search on Background | Off | Opening a background search clears the search bar |
| Clear Search on Current Tab | Off | Opening a result in the current tab clears the search bar |
| Lucky Search Provider | Google | Search engine for "I'm Feeling Lucky" |
| Show Entity Images | Off | Rich thumbnails in search suggestions |

### Window Filter

| Preference | Default | Description |
|------------|---------|-------------|
| Show Window Filter | On | Dropdown to filter tabs by browser window |
| Enable Smart Window Naming | On | Windows named by active tab title/domain |
| Include 'All Windows' View | Off | Adds an "All Windows" option to the window filter |
| Group Tabs by Domain | Off | Groups tabs by domain in the expanded view |

### Title Bar

| Preference | Default | Description |
|------------|---------|-------------|
| Title Bar: Show | Clock | What to show next to the mode label — Clock, Tab & Group Count, Mode Label Only, or Nothing |
| Title Bar: Time Format | `h:mm:ss a` | Format string for the clock (e.g. `HH:mm`, `h:mm a`) |

### Tab Icons & Colors

| Preference | Default | Description |
|------------|---------|-------------|
| Icon: Sleeping Tab | `Icon.Waveform` | Raycast icon name for sleeping/frozen tabs |
| Icon: Discarded Tab | `Icon.LivestreamDisabled` | Raycast icon name for discarded tabs |
| Icon: Pinned Tab | `Icon.Pin` | Raycast icon name for pinned tabs |
| Color: Sleeping Tab | `SecondaryText` | Hex code or Raycast color name |
| Color: Discarded Tab | `SecondaryText` | Hex code or Raycast color name |
| Color: Pinned Tab | `Blue` | Hex code or Raycast color name |

---

## Project Structure

```
raycast-extension/
├── src/
│   ├── tabSwitch.tsx              # "Switch Tabs" command — data layer entry point
│   ├── manageServer.tsx           # "Manage Server" command
│   ├── helpers.ts                 # Cache, shortcut resolver, icon/color helpers
│   ├── constants.ts               # Browser icon map, constants
│   ├── types.ts                   # Shared TypeScript interfaces
│   ├── components/
│   │   ├── TabSwitchList.tsx          # Search layer — List wrapper, search state isolation
│   │   ├── TabSwitchContent.tsx       # Rendering shield — tab list in filter mode
│   │   ├── TabSwitchStatusViews.tsx   # Server down / connection error / onboarding views
│   │   ├── TabItem.tsx                # Individual tab list item + full action panel
│   │   ├── NormalTabsSections.tsx     # Expanded tab list (grouped by window/domain)
│   │   ├── CollapsedTabsSection.tsx   # Collapsed view (groups as folders)
│   │   ├── SearchResultsSection.tsx   # Web search results list
│   │   ├── BrowserWindowFilter.tsx    # Browser/window dropdown accessory
│   │   ├── SearchModeToggle.tsx       # Toggle Filter / Search mode action
│   │   ├── CycleBrowserAction.tsx     # Cycle browser filter action
│   │   ├── CycleWindowAction.tsx      # Cycle window filter action
│   │   ├── ToggleCollapseAction.tsx   # Toggle collapsed/expanded view action
│   │   ├── TabPreview.tsx             # Inline tab detail/preview view
│   │   ├── WebSearchView.tsx          # Navigate tab to a URL
│   │   ├── TargetInputSearchView.tsx  # Surgical input field search targeting
│   │   ├── RenameTabForm.tsx          # Rename tab form
│   │   ├── CreateGroupForm.tsx        # Create tab group form
│   │   ├── EditGroupForm.tsx          # Edit group name/color form
│   │   ├── TabGroupView.tsx           # Expanded group detail view
│   │   ├── BookmarksAction.tsx        # Bookmarks panel trigger
│   │   ├── BookmarksView.tsx          # Bookmarks browser view
│   │   ├── BookmarkFolderPicker.tsx   # Folder picker for saving bookmarks
│   │   ├── RenameBookmarkForm.tsx     # Rename bookmark form
│   │   ├── HistoryView.tsx            # History browser view
│   │   ├── HistoryAction.tsx          # History panel trigger
│   │   ├── DownloadsAction.tsx        # Downloads panel trigger
│   │   ├── DownloadsView.tsx          # Downloads browser view
│   │   ├── SessionsAction.tsx         # Sessions panel trigger
│   │   ├── SessionsView.tsx           # Recently closed tabs view
│   │   ├── WorkspacesAction.tsx       # Workspaces panel trigger
│   │   ├── WorkspacesView.tsx         # Workspaces browser view
│   │   └── index.ts                   # Component barrel exports
│   ├── context/
│   │   └── BrowserStore.ts        # Global browser state, WebSocket, health check, metadata sync
│   ├── hooks/
│   │   ├── useBrowser.ts          # Core data hook — tabs, groups, bookmarks, sessions
│   │   ├── useTabActions.ts       # All tab action dispatchers
│   │   ├── useFilterState.ts      # Persistent browser/window filter state
│   │   ├── useLocalSearch.ts      # Client-side tab search + browser page matching
│   │   ├── useWebSearch.ts        # Web search suggestions hook (Google/YouTube)
│   │   └── useDebounce.ts         # Debounce utility hook
│   └── utils/
│       ├── tabMerger.ts           # Tab merging, enrichment, display subtitle computation
│       └── searchTypes.ts         # Search-specific types
├── assets/
│   ├── command-icon.png
│   └── all.png / edge.png / chrome.png / brave.png / helium.png
├── package.json
├── raycast-env.d.ts
└── README.md
```

---

## Development

```powershell
npm install       # install dependencies
npm run dev       # start Raycast dev mode (ray develop)
npm run build     # production build
npm run lint      # lint check
npm run fix-lint  # auto-fix lint issues
```

---

## License

MIT
