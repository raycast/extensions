# TickTick Changelog

## [1.1.0] - 2026-02-19

### Added
- Task Detail view with full notes, checklist items, tags, and metadata
- Move to Project action for quick task reassignment
- Menu Bar Tasks command showing today's count with quick complete
- Calendar 7-day agenda view with time slots and overdue section
- Focus timer task linking — select a task to work on during a session
- No Due Date section in Today's Tasks view
- Relative date labels (Today, Tomorrow, in 3 days)
- Smart date defaults when creating tasks from the calendar
- Copy Project ID action in Projects command
- All Day checkbox in task form for timed vs all-day tasks
- Focus timer session progress tracking with recommended next session
- Tag display in calendar agenda items

### Fixed
- Focus timer no longer auto-advances sessions without user confirmation
- Stop Timer now requires confirmation to prevent accidental session loss
- TaskForm no longer forces isAllDay — timed tasks now preserve their time
- Project task counts refresh after completing tasks inside a project
- Calendar command description updated to match actual functionality

### Changed
- Extension renamed from "TickTick for Windows" to "TickTick" — fully cross-platform
- View Details is now the primary action (Enter) on task rows
- Edit Task moved to Cmd+E shortcut
- Default Project preference description improved with Copy Project ID reference

## [1.0.0] - 2026-02-19

### Added
- View today's and upcoming tasks
- Search across all projects with title and notes matching
- Browse projects and inbox
- Add tasks with full details or quick add from command bar
- Complete, edit, delete tasks inline
- Cycle task priority
- Pomodoro focus timer with configurable durations
- Tag and checklist support
