# FreeAgent Changelog

## [Fix time parsing in Create Timeslip] - 2026-01-08

- Fixed bug where entering time in HH:MM format (e.g., `4:30`) would only record the hours portion
- Now supports both HH:MM format (`4:30` = 4.5 hours) and decimal format (`4.5`)
- Added validation for invalid time inputs with helpful error messages

## [Added new command to create tasks in projects] - 2025-11-12

- New `Create a new task in FreeAgent` command

## [Timezone Fix for Date Handling] - 2025-08-27

- Fixed timezone issue where selecting "today" in timeslip and invoice creation would sometimes be saved as "yesterday" in FreeAgent
- Users in timezones ahead of UTC (like BST/GMT+1) will now have their selected dates saved correctly
- Added new `formatDateForAPI()` utility function to handle date formatting without timezone conversion

## [Enhanced Timeslips and Banking Features] - 2025-08-08

- Timeslips now show actual project names, task names, and user names instead of technical IDs

## [Initial Version] - 2025-08-07