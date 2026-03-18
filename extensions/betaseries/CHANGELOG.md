# Betaseries Changelog

## [Menu Bar Background Refresh Fix] - 2026-03-12

- Fixed an error when marking an episode as watched from **My Shows** while **New Episodes Menu Bar** had not been activated yet.
- The menu bar refresh is now skipped when the command is unavailable in background mode, so the episode action still succeeds without showing a failure message.

## [New Episodes Menu Bar + Planning Fix] - 2026-02-26

- Added **New Episodes Menu Bar** command to see newly released unwatched episodes directly from the macOS menu bar, with a badge showing how many are available.
- Notifications are sent only for episodes that have already been released, are still unwatched, and are considered recent (to avoid old episodes triggering alerts).
- Added quick access to open each episode page from the menu bar.
- Added the ability to dismiss current notifications and refresh the list at any time.
- You can disable notifications for a specific show from the **My Shows** section.
- Added an optional debug view (disabled by default) to help troubleshoot notification behavior when needed.
- Fixed **Planning** behavior to avoid showing episodes that are already marked as watched.

## [Initial Version] - 2026-02-13
