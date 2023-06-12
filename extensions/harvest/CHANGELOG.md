# Harvest Changelog

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
