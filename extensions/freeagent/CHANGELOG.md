# FreeAgent Changelog

## [Timezone Fix for Date Handling] - {PR_MERGE_DATE}

- Fixed timezone issue where selecting "today" in timeslip and invoice creation would sometimes be saved as "yesterday" in FreeAgent
- Users in timezones ahead of UTC (like BST/GMT+1) will now have their selected dates saved correctly
- Added new `formatDateForAPI()` utility function to handle date formatting without timezone conversion

## [Enhanced Timeslips and Banking Features] - 2025-08-08

- Timeslips now show actual project names, task names, and user names instead of technical IDs

## [Initial Version] - 2025-08-07