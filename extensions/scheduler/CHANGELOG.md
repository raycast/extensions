# Scheduler Changelog

## [Fix execution of view-based commands] - 2026-02-16

- Fixed an error where commands with a UI (e.g. `brew > upgrade`) would fail with "Invalid launch: mode 'default' cannot launch mode 'view' with type 'background'" when scheduled to run in the background. These commands now automatically fall back to user-initiated launch mode so they still execute on schedule.

## [Bug Fixes and UI Improvements] - 2026-02-16

- Fixed a critical race condition in the background task (`execute-due-commands.ts`) that could lead to lost updates for scheduled commands if multiple commands were executed simultaneously. All updates are now accumulated and saved in a single, atomic operation.
- Fixed a race condition in the UI hook where React state batching could cause storage writes with stale data.
- Added robust data normalization for stored commands — malformed or incomplete entries are now validated, migrated to the current schema, and invalid entries are automatically cleaned up.
- Commands that fail with permanent errors (e.g. uninstalled extension, invalid deeplink) are now auto-disabled to prevent repeated failures.
- Added deeplink validation before execution to surface clear errors for empty or malformed deeplinks.
- Storage writes are now skipped when no mutations occurred, reducing unnecessary I/O during background execution.
- Improved the user interface to automatically refresh the list of scheduled commands when the view becomes visible, ensuring that changes made by the background task are immediately reflected.


## [Background Refresh Alert] - 2025-11-18

- Added warning banner to alert users when background refresh is not enabled for scheduled commands
- Fixes issue where users couldn't understand why scheduled commands weren't executing automatically

## [Run missed schedules immediately] - 2025-10-10

- ▶️ Added an option to immediately run a scheduled command if it was missed (e.g., the machine was asleep). Note: in this case "immediately" means within one minute of Raycast starting.

## [Added new schedule types] - 2025-09-10

- You can now schedule commands to run every 15 or 30 minutes (works well for scheduling AI commands)
- Added hourly schedule
- Added a super flexible custom schedule for very specific schedules using a Cron expression

## [Initial Version] - 2025-08-22

- 🎉 Initial release of the Scheduler extension
- ⏰ Create and manage scheduled commands
- 🔄 Execute commands on schedule
- 📊 View execution logs and history
