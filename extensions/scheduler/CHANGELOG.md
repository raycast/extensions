# Scheduler Changelog

## [Background Refresh Alert] - {PR_MERGE_DATE}

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
