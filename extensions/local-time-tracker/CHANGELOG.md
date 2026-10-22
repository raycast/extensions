# Changelog

## [Daily Plans and Subtasks] - 2026-10-21

- Add Today's Plan for daily goals, optional subtasks, completion, and tracked time, with goals and subtasks entered in one form field.
- Start or stop a task with Return and toggle completion with Command+Return; switching tasks saves the previous timer.
- Sort plans and subtasks with Command+Option+Up/Down, finishing with Return or Escape.
- Import incomplete plans from the last day with tasks using Command+Shift+I, preserving completed steps and order. Show a notification when nothing remains to import.
- Revisit earlier dates and move individual plans to today while preserving historical logs, reports, and running timers. Time totals are scoped to each day.
- Preserve existing tracking commands and Pomodoro, protect running tasks during editing, and reject stale plan saves even after clock changes.

## [Precise Work Time Editing] - 2026-10-17

- Return to an empty Root Search after successfully starting work, and label the running-timer view "Tracking Work".
- Edit start and end times in 1-minute steps with live current times and a compact preview without duration comparisons.
- Use native text rendering without bar images to avoid image-replacement flicker.
- Adjust times by 1 minute with Left/Right or 5 minutes with Shift plus Left/Right; Up/Down focuses Start/End, and Return saves from either endpoint with the save action visible in the bottom-right corner.
- Limit work-log end times to the current time, removing the previous five-minute future allowance. When adjusting End into the current minute, cap future hidden seconds at now so that minute can always be selected.
- Apply exact dates and minute-precision times to the preview without saving until the final save action.
- Correct a running timer's start time from Start Work using the same numeric preview.
- Keep project and description edits in the preview until the final save action.
- Preserve Pomodoro intervals and delivered alerts when correcting work time, and protect edits against concurrent timer operations.

## [Pomodoro, Timer Alerts, and Improved Reports] - 2026-10-14

- Add a configurable work-timer alert, notified once per timer in a silent, persistent foreground Raycast window.
- Add optional Pomodoro work, short-break, and long-break intervals with manual transitions.
- Show interval completion with actions to dismiss or start the next interval; work tracking continues through breaks and waiting.
- Persist reminder state across restarts and use a tomato menu bar icon during Pomodoro sessions.
- Add a visible ⌘⇧P shortcut for toggling Pomodoro in Start Work.
- Combine simultaneous timer and Pomodoro reminders, retry failed notifications, and serialize timer changes with Pomodoro operations.
- Add a Reports dashboard with tracked-time totals, session counts, project mix, 7-day bars, and 35-day activity, with project/group filtering and expandable project lists.
- Rename project categories to project groups throughout the interface while preserving existing saved data.
- Show the selected project’s group above the project picker in Start Work.
- Match Reports visual summaries to Raycast’s light or dark appearance.

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
