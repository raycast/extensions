# Claude Usage Tracker for Raycast

See your Claude plan limits at a glance, powered by the [Claude Usage](https://github.com/hamed-elfayome/Claude-Usage-Tracker) menu bar app.

Claude Usage already signs in to Claude and keeps your limits up to date. This extension reads what the app saves, so there is nothing to configure: no API keys, no cookies and no extra logins.

## Commands

| Command | What it shows |
| --- | --- |
| **Usage Limits** | Every limit tracked by Claude Usage (5-hour session, weekly, and the weekly limits of single models) with the remaining quota, a reset countdown and your pace: whether you are in reserve or burning faster than an even spread, and when you would run out. |
| **Usage Overview** | A dashboard of gauges, one row per profile, with reset countdowns and pace. |
| **Show Usage** | The limit closest to running out, in the HUD, without opening a window. |
| **Usage History** | How much of each past session and week had been used when it reset. |

### Choose and order profiles

Claude Usage can track several Claude accounts as profiles. Press `⌘⇧L` (**Manage Profiles**) in Usage Limits or Usage Overview to hide profiles and reorder them (`⌘⌥↑` / `⌘⌥↓`). The layout is shared by Usage Limits, Usage Overview and Show Usage.

Want a command for a single profile? Use **Create Quicklink for…**. The quicklink opens the dashboard filtered to that profile, and you can give it its own alias and hotkey.

## Requirements

- [Claude Usage](https://github.com/hamed-elfayome/Claude-Usage-Tracker) installed in `/Applications` (or `~/Applications`), signed in and running.

## Preferences

- **Percentages**: show limits as *remaining* (default) or *used*.

## How it works

- Claude Usage has no URL scheme, AppleScript dictionary or command line tool. It does save every profile, with its latest reading, in its preferences file (`~/Library/Preferences/HamedElfayome.Claude-Usage.plist`) under the `profiles_v3` key: a `Data` value that holds JSON. The extension reads that value with `plutil`, so every command opens instantly and nothing is sent over the network.
- The app rewrites the reading on every refresh (every 30 seconds by default) and the open commands re-read it at the same rhythm. The extension cannot ask the app to refresh: when the reading is older than ten minutes (or than three of the profile's refresh intervals, if that is longer), usually because the app is not running, the commands say so instead of presenting old numbers as current.
- Limits that do not apply to your plan are stored as zero and are left out. A session that has not started yet is shown as "No active session".
- **Pace** is computed locally with a linear model: after 12 hours of a 7-day window, about 7% used is "on pace". Each gauge shows it as a thin inner ring in Claude orange for the time left in the window: when the outer quota arc is longer than the time ring you are in reserve, when it is shorter you are burning faster than an even spread.
- **Usage History** reads the JSON files the app keeps in `~/Library/Application Support/Claude Usage/history/`, one entry per reset.
- The account details stored with a profile are parsed only to pick the plan name. Emails and organization names are never displayed, cached or sent anywhere, and credentials are not stored in that file at all.
