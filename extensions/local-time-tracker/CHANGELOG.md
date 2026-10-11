# Changelog

## [Time Alerts and Pomodoro] - {PR_MERGE_DATE}

- Add configurable daily-total and per-timer alerts with silent Raycast notifications.
- Add optional Pomodoro work, short-break, and long-break intervals with manual transitions.
- Open a persistent foreground Raycast window when a Pomodoro interval finishes, with actions to dismiss or start the next interval.
- Persist reminder state across restarts and use a tomato menu bar icon during Pomodoro sessions.

## [Initial Version] - 2026-10-09

- Add client and internal project management.
- Add custom project categories that can be created, renamed, and safely deleted.
- Use custom categories in project pickers, work logs, and reports.
- Allow multiple projects to use the same display name.
- Add a preferred project for quick timer starts.
- Keep project selection focused consistently when starting work.
- Add start and stop commands with an optional task description.
- Add reusable recent task descriptions per project.
- Add menu bar timer with background refresh.
- Add searchable and editable work logs.
- Refresh work log details immediately after edits.
- Add daily, weekly, monthly, project, and project-type reports.
- Add local-only storage with no external services.
