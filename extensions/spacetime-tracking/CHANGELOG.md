# Spacetime Tracking Changelog

## [Initial Version] - 2026-08-03

- Track time spent in each macOS Space, right from the menu bar
- One combined Spaces list in the menu bar — see each space's recorded time and click to switch to it
- Start, stop, and browse tracking sessions, with a per-space breakdown and percentages
- Name your spaces; names are used everywhere time is shown
- Switch spaces following your macOS space order (Ctrl + number), set up in one click along with the Accessibility check
- Export a session to CSV (choose where to save), or save sessions automatically when they stop — optionally organized into year/month subfolders
- Automatic daily session that starts a fresh session once a day
- Automatic pause when you're away from the keyboard (configurable idle threshold), with an option to keep tracking while media is playing
- Track only the main display
- Resume a stopped session from the Sessions view when nothing else is recording (its saved CSV is removed until the session stops again)
- Keep every session within one calendar day: a session crossing midnight is stopped at 00:00 and a new one starts at 00:01 (or at your next activity) — a new preference, on by default
- Hide short spaces: set a minimum number of minutes so spaces below it are left out of the breakdown and the exported rows — the session total always counts every space
- The Sessions view counts up live, and says why it isn't recording (paused, idle, or focused on another display) instead of showing a total that sits still
- Consistent zero-padded 24-hour times across the Sessions view and CSV exports (e.g. 05:12:33)