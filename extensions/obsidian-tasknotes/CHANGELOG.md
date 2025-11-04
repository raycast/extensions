# Obsidian TaskNotes Changelog

## [Code Quality Improvements] - 2025-11-04

### Fixed
- Renamed internal `fetch` method to `request` in API client to avoid shadowing global `fetch` function
- Replaced manual error toast handling with `showFailureToast` from `@raycast/utils` for better error UX
- Fixed useEffect dependency array in Pomodoro timer by wrapping `loadStatus` in `useCallback`
- Made "Resume Pomodoro" action conditional - only shows when there's a paused session to resume
- Updated status handling in Edit Task to allow explicitly setting status back to 'open'
- Fixed grammar in README: "a awesome" → "an awesome"

## [Initial Release] - {PR_MERGE_DATE}

- **Menu Bar Integration**: Always-on menu bar command showing today's and overdue task counts
  - Visual indicator with red dot when tasks are due, green checkmark when clear
  - Click to view tasks organized in Overdue and Today sections
  - Quick actions to open View Tasks or Create Task commands
  - Keyboard shortcuts: Cmd+O (View All), Cmd+N (Create Task)
- **Task Management**: Browse and manage tasks with smart filters (Today, Overdue, All Open)
- **Quick Task Creation**: Create tasks with full metadata support (priority, dates, projects, tags)
- **Natural Language Input**: Quick Add Task command for rapid task creation
- **Obsidian Integration**: Open tasks directly in Obsidian using Advanced URI plugin
- **Pomodoro Timer**: Start, stop, pause, and resume Pomodoro sessions linked to tasks
- **Real-Time Search**: Search across task titles, projects, and tags
- **Keyboard Shortcuts**: Cycle status, archive, delete, and refresh with keyboard
- **Visual Indicators**: Priority badges, overdue markers, and smart date formatting