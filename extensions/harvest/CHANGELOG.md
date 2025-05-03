# Harvest Changelog


## [Fixes] - 2024-06-07

- Fix: on New timer entry, date will now default to the current date instead of "No Date"

## [Cache Improvements] - 2024-05-28

- Improve caching for projects and time entries throughout the extenstion and menu bar. Thanks @klmz for helping me disagnose this!
- Better parsing of decimals to hours/minute format
- Removed callback URLs in the menu bar command (use "Status Folder" feature instaed, see README)
- Added "Stop Timer" option to menu bar widget

## [Fixes] - 2024-04-08

- Improved cache for projects and tasks

## [Toggle Timer Entry Command] - 2024-01-02

- Added: New command to toggle the timer on the most recent time entry
- Added: New preference to save the currently running timer to a JSON file of the user's choice. This can be used to trigger other apps or scripts when a timer is started or stopped without using the callback URL feature (which takes away Raycast from the foreground)
- Fixed: Check for when the extentions is rate-limited by Harvest and automatically retry after the timeout

## [Menu Bar Fixes] - 2023-07-24

- Fix: Menu bar widget snows the running timer in the format based on the user's preference
- New option added to hide the timer from the menu bar widget

## [Customize Time Entry Form] - 2023-06-11

- Add new preference to show all times using hours/minutes, decimal, or whatever your company prefers in your Harvest account (default)

## [Menu Bar Support] - 2023-05-22

- Add support for a menu bar widget that shows the current running timer.
- Add Callback URLs to trigger other apps when a timer is started or stopped.

## [Better Project Search] - 2023-01-31

- Add user preference to show the client's name for the selected project in the time entry form

## [Better Project Search] - 2022-09-29

- You can now search via client name in the project dropdown

## [Improve Cache] - 2022-08-31

- Remove SWR dependency in favor of @raycast/utils useCachedPromise for faster loading of project when creating a time entry

## [Updated branding & icons] - 2022-08-02

- Updated brading and icons
- Updated Raycast API

## [Edit Time Entries] 2022-04-08

- Added: You can now edit previous time entries from the action menu or `cmd + E`.
- Added: Duplicate a time entry.
- Changed: When creating a new time entry, the form will now recall your last selected project and task.
- Fixed: Date field in the time entry form now correctly hides the time.
- Changed: Added a warning if you are about to start a timer on a previous or future day.

## [Pagination Support] 2022-01-13

- Fixed: You can now view all projects in the dropdown, not just the first 100

## [Fixes & Bits] 2022-01-04

- Fixed: Update SWR package to 1.1.2 (handles window.requestAnimationFrame bug)
- Security: Harvest admins are now limited to only view their own time entries, even if their API creds allow them to view/edit other user's timers in their company.
- Added: Support for viewing time entries on other days.
- Added: User preference to control how time entries are sorted
- Changed: Remove brackets in project picker if no code is present (fixes [Extension Bug] Harvest - @eluce2 #538)
- Changed: Project picker now groups projects by client (more similar the Harvest app)
- Changed: Now uses new alert dialog for deleting time entry confirmation
- Added: Total hours for a given day are shown in the header of the list of time entries

## [Added Extension] 2021-12-14

Initial Code
