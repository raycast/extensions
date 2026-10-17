# TXTodo Changelog

## [Initial Version] - 2026-06-16

- Show Tasks: view, complete, prioritize, edit tasks from `todo.txt`
- View presets: Active, Today, This week, Overdue, Inbox, All, Completed — pickable from the command's argument dropdown and switchable in-view
- Tag filters: filter by `+project` and `@context`, AND'd on top of presets, with autocomplete
- Add Task: structured form with inline `+project` / `@context` autocomplete
- Detail sidebar with task metadata (priority, dates, projects, contexts)
- Menu bar: pending count with top-10 dropdown, auto-refreshes every 10 minutes in the background
- Save current view as a Raycast Quicklink (⌘⇧Q)
- Archive completed tasks to `done.txt`
- Auto-stamp creation date on new tasks (preference)
- Atomic file writes with external-edit detection (file is the source of truth — plays well with other todo.txt tools)
