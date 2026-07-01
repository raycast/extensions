# FreeAgent Changelog

## [Fix review feedback for AI tools] - 2026-05-14

- `add-bank-transaction-explanation`, `update-bank-transaction-explanation`, `update-bank-transaction`, and `upload-attachment` now require explicit confirmation before writing
- `add-bank-transaction-explanation` now validates that `bankAccountUrl` is provided and no longer accepts a non-functional `attachmentUrl` parameter (use `upload-attachment` + `update-bank-transaction-explanation` instead)
- `update-bank-transaction-explanation` no longer rejects valid 11+ digit explanation IDs and treats explicitly-passed empty strings/zero values as intentional updates
- `get-all-bank-transactions` summary totals are now computed across the full result, not just the displayed slice
- `cash-flow-summary` shows trend periods most-recent first (was reversed), uses a proper singular-period label, and drops a dead `.reduce(...)` call
- `analyze-financials` no longer hides the "Financial Overview" section when `analysisType="overview"` is requested
- `match-file-to-transaction` guards against division by zero when the file or invoice amount is `0`
- `search-explained-transactions` filters by date server-side instead of after fetching every explained transaction
- `create-invoice-ai` defaults `sendEmail` to `false` so brand-new invoices (which still need line items) are never auto-emailed
- `upload-attachment` performs proper base64 validation (the previous `Buffer.from` check never threw)
- `cash-flow-summary` no longer advertises an unimplemented `"custom"` period that produced corrupted output
- `match-file-to-transaction` invoice lookup now succeeds when only one of `fileAmount` or `fileDate` is provided (previously required both)

## [Add AI tools for managing projects, tasks, and timeslips] - 2026-05-14

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