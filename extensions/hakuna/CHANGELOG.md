# Hakuna Timer Changelog

## [Menu Bar, Absences, Profiles, and More] - {PR_MERGE_DATE}

### New Commands

- **Hakuna Menu**: Menu bar widget showing worktime, active timer, stop/edit actions, today's absences, and recent time entries — updates every 5 minutes
- **Absences**: List absences for any year, filter by type, navigate between years with keyboard shortcuts, and view other users' absences
- **Profile**: View overtime and vacation days for yourself or other users, with group filtering
- **Time Entries**: List today's time entries, start a timer from an existing entry, and delete entries
- **Add / Edit Time Entry**: Create new time entries or edit existing ones, with project/task selection

### Enhancements

- Remember the most recently selected project and task in the timer form
- Show budget info when selecting a project in the timer form
- Show the active timer in the time entries list
- Format durations according to tenant preferences
- Navigate time entries by day (⌘H / ⌘L) or week (⌘⇧H / ⌘⇧L), jump to today with ⌘0
- Navigate absences by year (⌘H / ⌘L / ⌘0)
- Filter absences by type
- Filter profiles by group
- View absences of other users from their profile

### Removed

- **Get Worktime** and **Get Vacation Days** commands — this information is now available in the Profile command

## [Initial Version] - 2024-10-04
