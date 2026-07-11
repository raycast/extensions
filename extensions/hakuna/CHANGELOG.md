# Hakuna Timer Changelog

## [Menu Bar, Entries, Profiles, Absences, and More] - 2026-05-25

### New Commands

- **Hakuna Menu**: Menu bar widget showing worktime, active timer, today's absences, and recent time entries — updates automatically
- **Time Entries**: List today's time entries, start a timer from an existing entry, and delete entries
- **Absences**: List absences for any year, filter by type, navigate between years with keyboard shortcuts, and view other users' absences
- **Profile**: View overtime and vacation days for yourself or other users, with group filtering
- **Add / Edit Time Entry**: Create new time entries or edit existing ones, with project/task selection

### Enhancements

- Support for entries and timers
- Support for projects
- Support for co-workers
- Render times in tenant's format (`hh:mm` vs `hh.hh`)
- Sensible keyboard shortcuts and default actions
- Menu Bar for quick access
- Agressive caching of API responses to comply with Hakuna API request limits

### Removed

- **Get Worktime** and **Get Vacation Days** commands — this information is now available in the Profile command

## [Security Maintenance] - 2026-05-21

- Updated the extension to address security advisories.

## [Initial Version] - 2024-10-04
