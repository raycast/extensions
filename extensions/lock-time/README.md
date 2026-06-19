# Lock Time

Quietly tracks how long your Mac stays locked — and how long you stay focused between unlocks.

## Features

- **Today Locked Time** — Cumulative lock duration for today, press Enter to view session breakdown
- **Today Lock Sessions** — Drill down to see each lock session's time range and duration
- **Last Lock Duration** — How long your last lock session lasted, with time range (e.g. `12:57 → 13:48`)
- **Last Unlock Interval** — How long you worked continuously between unlocks
- **Menu Bar** — Real-time lock time displayed in your menu bar with time range info
- **Zero Config** — Works immediately after installation, no setup required
- **Local-First** — All data stored locally, nothing leaves your Mac
- **Fast** — First load in under 0.5s, cached loads under 0.1s

## Commands

| Command | Type | Description |
|---------|------|-------------|
| **Lock Stats** | View | View today's lock time statistics |
| **Update Lock State** | Background | Automatically detects and updates lock state every 60 seconds |
| **Lock Time Menu Bar** | Menu Bar | Shows today's cumulative lock time in the menu bar |

## How It Works

Lock Time checks your Mac's lock state every 60 seconds using a multi-level detection strategy:

1. **Swift + CGSessionCopyCurrentDictionary** (primary) — Queries the CoreGraphics system API directly for the `CGSSessionScreenIsLocked` field. No extra permissions needed. Most reliable on macOS 13+.
2. **AppleScript frontmost process detection** (fallback) — Infers lock state by checking if the frontmost process is `loginwindow` or `ScreenSaverEngine`.
3. **Gap Detection** (safety net) — When the polling interval exceeds the expected threshold (>90s), infers that the Mac was locked during the gap.

If detection fails, the extension preserves the last known state rather than guessing.

## Actions

- **Refresh** (Cmd+R) — Refresh statistics
- **Copy Stats** — Copy all stats to clipboard
- **Diagnostics** (Cmd+T) — Run real-time detection diagnostics
- **Manual Update** (Cmd+U) — Force a state update
- **Reset Today** — Reset today's statistics
- **Reset All Data** — Clear all stored data

## Data Privacy

- All data is stored exclusively in Raycast LocalStorage
- No network requests are made — ever
- No account or sign-in required
- Uninstalling the extension removes all data completely
