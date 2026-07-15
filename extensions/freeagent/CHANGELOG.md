# FreeAgent Changelog

## [Add Create Expense command] - 2026-07-01

- Added a Create Expense command to record out-of-pocket expenses against a category
- Supports selecting a category (grouped as in the FreeAgent web app), amount, date, description and sales tax rate
- Optionally attach a receipt (PNG, JPG, GIF or PDF) to the expense

## [Fix missing tasks and projects in Create Timeslip] - 2026-07-01

- Fixed bug where projects with more than 25 tasks only loaded the first page, leaving later tasks unselectable (and unsearchable) in the Create Timeslip form
- Now fetches all pages for tasks and projects so the full list is available

## [Fix review feedback for AI tools] - 2026-05-14

- Added `list-projects`, `create-project`, and `delete-project` AI tools (create/delete require confirmation)
- Added `list-tasks`, `create-task-ai`, `update-task`, and `delete-task` AI tools, all with confirmation for mutations
- Added `list-timeslips-ai`, `create-timeslip-ai`, `update-timeslip`, and `delete-timeslip` AI tools, including the ability to switch a timeslip to a different task
- Updated the AI instructions with a workflow for "clean up tasks and recreate from a structure"

## [Fix timeslip date display] - 2026-04-15

- Changed timeslip list to show day-level relative dates (Today, Yesterday, 3 days ago) instead of hour-level (14 hours ago)
- Timeslips in FreeAgent are day-level, so hour-level precision was misleading

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