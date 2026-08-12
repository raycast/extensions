# CalTask Changelog

## [Added Event Management and AI Search] - 2026-03-12

- Added create, edit, and delete calendar events with full EventKit support
- Added AI-powered natural language search (e.g., "meetings last week")
- Added Manage Calendars command to toggle visibility and set default calendar
- Added event form with recurrence rules, alarms, and all-day event support
- Added Quick Add with AI parsing for both timer and event creation
- Added search range dropdown (This Week, 1 Month, 3 Months, 6 Months, 1 Year, All Time)
- Added calendar events caching for faster startup
- Added configurable preferences for AI model, upcoming days, history days, and default event duration

## [Initial Version] - 2026-02-16

### Timer

- Start/stop task timer with one click
- Auto-suggest recent task names
- Assign tasks to specific calendars
- Add notes and URL to tasks
- Auto-export completed tasks to Mac Calendar

### Task Management

- Exported tasks removed from local storage after successful calendar export
- Task deduplication: stopping a timer replaces older tasks with the same name and calendar

### Dashboard

- View task history
- Real-time timer display
- Quick restart from recent tasks

### Menu Bar

- Current timer display in menu bar
- Stop and export directly from menu bar

### Reports

- Generate time reports from Mac Calendar
- Filter by time range (Today, This Week, This Month, Custom)
- Calendar-based time breakdown
