# Next Up Changelog

## [Initial Release] - 2026-05-11

### Features

- **Today** command: see today's upcoming classes at a glance, with the next class highlighted in an "Up Next" section
- **Schedule for the Week** command: browse your full week with a day-picker dropdown; today's day is starred
- **Manage Schedules** command: full CRUD for schedule groups and courses — create groups, add courses with multiple time slots, set an active group, rename/delete groups
- **Next Up Menu Bar** command: persistent menu bar item showing your next class title and start time; click to see today's full schedule or join a meeting link
- **Add Ephemeral Course** command: quickly add a one-day temporary course that auto-expires tomorrow
- Multi-slot courses: a single course can have up to 3 schedule slots (e.g., MWF lecture + Tuesday lab)
- Course detail view (`⌘E`): tap any course to see full details — room, professor, meeting link, class link, units
- Color and icon customization per course (8 named colors + custom hex, 27 icons)
- Custom hex color support: enter any `#RRGGBB` value when "Custom..." is selected in the color picker
- Professor info with one-tap email action (`mailto:`)
- Meeting link support with one-tap open action per course slot (`⌘↵`)
- Class link and extra link fields for quick browser access
- Course code and units fields for academic tracking
- Automatic purge of expired ephemeral courses on every app launch
- Time validation on course form: rejects invalid HH:MM values and start ≥ end times
- **Conflict detection**: saving a course that overlaps an existing course on the same day is blocked with a descriptive error toast
- **Schedule templates**: save a set of slot day/time/room patterns and apply them to any course form in one action
- **Duplicate course** (`⌘D`): copy an existing course with all fields pre-filled; slot IDs are reassigned automatically
- **Archive / unarchive groups** (`⌘⇧A`): hide old groups without deleting their data; toggle archived view at any time
- **Export to file** (`⌘⇧O`): save a full JSON snapshot of all schedule data to a configurable folder (default: `~/Downloads`)
- **Import from file** (`⌘⇧I`): merge groups from a previously exported JSON file into the current data
- **Statistics view** (`⌘⇧S`): total courses, units, weekly hours, hours per day, and busiest day for the active group
- **Course filter modes** in Manage Schedules: Show All (`⌘⇧L`), Ephemeral Only (`⌘⇧E`), Active Group Only (`⌘⇧G`), Conflicts Only (`⌘⇧C`)
- **Create New Group** shortcut (`⌘⇧N`) available from any context in Manage Schedules
- First created group auto-activates so the app is useful immediately
- Search/filter in Manage Schedules across group names and course titles/codes
- Confirmation alerts before destructive actions (delete group, delete course)
- Refresh data action (`⌘R`) to reload from storage on demand
- Export / import file paths configurable via Raycast Extension Preferences
