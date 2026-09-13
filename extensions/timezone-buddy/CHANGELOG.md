# Timezone Buddy Changelog

## [Visual Refresh] - {PR_MERGE_DATE}

- Added a "Compare All Buddies" view (`Cmd`/`Ctrl` `Shift` `C`) that stacks every buddy's day into one aligned grid keyed to your local hours, so a column that's green top to bottom is a slot where the whole group is reachable, with the shared window computed for you and time-travel controls to slide the comparison forwards or back
- Added an "Open in compare view" preference so the command can jump straight to the compare grid on launch
- Added a detail pane (toggle with `Cmd`/`Ctrl`) showing a colour-coded hour band for each buddy's day, a metadata panel (local time, date, zone abbreviation, offset, Twitter/X link) and a "good time to reach out" hint expressed in your own local time
- Reworked the menu bar to show a status emoji and each buddy's date, with items now launching the main command
- Centralised all hour-of-day logic (colour, icon, tooltip) into a single source of truth
- Fixed timezone offset calculation to correctly handle fractional-hour zones (e.g. India, Nepal) and daylight saving

## [Windows Keyboard Shortcuts Support] - 2026-04-03

- Added Windows-specific keyboard shortcuts (`Ctrl` equivalents) for all actions

## [Fix] - 2025-11-06

- Toggled on windows support in package.json

## [Added Windows Support] - 2025-10-30

## [New Feature] - 2025-08-06

- Added time offset functionality to view times in the future or past

## [Initial Version] - 2024-02-29

- Initial version of the extension with a command to view buddies and time for their Timezone
