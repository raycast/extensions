# DesktopRenamer Changelog

## [Desktop Controls and Window Actions] - 2026-09-21

- Added desktop locking, restoring moved windows, and desktop reordering actions to `Switch Desktop`
- Added keyboard shortcuts and pending-restore counts for desktop actions
- Improved window moves, window actions, and batch operations across spaces and displays
- Improved desktop grouping, current-desktop indicators, and app icons in window pickers
- Migrated communication to the structured SpaceAPI while retaining compatibility with older installations
- Preserved compatibility with legacy DesktopRenamer installations while preferring the current SpaceAPI notification namespace

## [Fix] - 2026-08-21

- Reduced background desktop status refreshes to once per minute.

## [Window Actions] - 2026-08-03

- Added window actions to `Batch Move Windows` and `List Windows` commands
- Added displaying app icon for full screen desktops
- Changed `Batch Move Windows` command labels
- Fixed Command + Enter triggering other actions in `Batch Move Windows` command

## [New Commands] - 2026-05-17

- Added `Move Window` command
- Added `List Windows` command
- Added `Batch Move Windows` command
- Added `Reload Space Labels` command
- Added `Move Window` actions to `Switch Desktop` command
- Removed `Toggle Space Label Window` command

## [Added DesktopRenamer] - 2026-02-26

- Initial release of the DesktopRenamer extension.
