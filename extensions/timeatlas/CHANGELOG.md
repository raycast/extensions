# Timeatlas Changelog

## [Initial Release] - 2026-09-25

- Add Note command with date picker and text form
- Writes notes directly to the Time Atlas iCloud Documents folder
- Optional preference to override the iCloud folder path
- Today at a Glance — Overview plus Sleep, Places, Steps, Distance, and Notes (rows hide when empty)
- Sleep totals use wake-day attribution so overnight sleep matches Time Atlas
- Steps from the synced day total (`external_data`), with at-place walks as a breakdown
- Reads Time Atlas iCloud timeline (`.pb`/`.zip`) and pending `note_*.json` on every open
- Shared setup checks for missing iCloud Drive / Time Atlas folder with recovery actions
