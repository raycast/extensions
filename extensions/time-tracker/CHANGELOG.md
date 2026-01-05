# Time Tracker Changelog

## [Initial Version] - 2026-01-05

### Added

- Manual time tracking with local JSON storage
- **Log Time** command with smart duration parsing (2.5h, 2h30, 2:30, 30m formats)
- **View Entries** command to browse, filter, edit, and delete time entries
- **Manage Projects** command to create, edit, archive, and delete projects
- Automatic cloud storage detection (Google Drive, Dropbox, iCloud Drive)
- Fallback to ~/Documents if no cloud storage found
- User preferences for data path, date format, and default project color
- Color-coded projects with 7 color options
- Time entry statistics and filtering
- Project archiving functionality
- Smart defaults (last used project, today's date)
- Clipboard support for exporting time entries

### Technical Features

- TypeScript + React with Raycast API
- date-fns for date manipulation
- Local JSON storage with automatic directory creation
- Cloud sync support through shared folder detection
- Configurable date formats (4 options)
- Configurable project colors
