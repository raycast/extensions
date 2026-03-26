# SingularityApp Changelog

## [0.2.0] - 2026-03-01

### Added

- Proper API pagination using `offset` + `maxCount` — all tasks are now fetched automatically across multiple pages (up to 1000 per request), no manual limit needed

### Changed

- API token is now configured via Raycast's built-in extension preferences (⌘ + Shift + , on any command) instead of a dedicated command — Raycast natively prompts on first launch
- 401 authentication errors now show an **Open Preferences** action in the error toast for quick recovery

### Removed

- **Set API Token** command — replaced by built-in Raycast preferences
- **Set Max Tasks Count** command — no longer needed due to automatic pagination



## [Initial Release] - 2026-01-29

### Features

- View tasks in multiple views (Inbox, Today, Upcoming, Completed)
- Create new tasks with title, notes, priority, dates, and project assignment
- Complete, update, and delete tasks
- View detailed task information including notes and metadata
- Project organization with custom icons
- Task note display with rich text support
- Configurable API token storage
- Adjustable task fetch limits for API pagination

### Commands

- **My Tasks**: Browse and manage your tasks with customizable default view
- **Add Task**: Quick task creation form with all essential fields
- **Set API Token**: Secure API token configuration
- **Set Max Tasks Count**: Configure task fetch limits
