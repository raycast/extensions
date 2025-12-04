# changedetection.io Changelog

## [Improvements] - 2025-10-14

- Included link to Diff view of snapshot
- Included action to mark as seen/unseen
- Added sort order to list of watches, so you can sort by last checked or last changed
- Added tags to watch details
- Added screenshot (and text snapshot) to watch details
- Refactored into separate screens/components/hooks for better readability and maintainability
- Enable extension for Windows as well

## [Create + Delete] - 2025-08-25

- feat: **Create** new watch
- feat: **Delete** existing watch
- show: `last_error` if exists
- add: `EmptyView` when no watches
- fix: would show *1970* when no `last_checked`
- modernize: use latest Raycast config

## [Initial Version] - 2024-11-27

- List Watches
- View Watch Details
- View List of Snapshots
- View items online
