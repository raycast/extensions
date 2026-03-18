# Mirror Displays Changelog

## [New Features & Bugfixes] - {PR_MERGE_DATE}
- Modernized UI to use a full-page Raycast List view instead of a background shortcut.
- Added ability to choose which display mirrors which (Mac -> External or External -> Mac).
- Migrated underlying logic to a stable CoreGraphics Swift script (replaces AppleScript keyboard emulation that caused brightness issues).
- Gracefully handles multiple external displays as well as zero external display states.

## [Initial Version] - 2025-01-16