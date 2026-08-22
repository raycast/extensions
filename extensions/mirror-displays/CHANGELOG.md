# Mirror Displays Changelog

## [Add mirroring toggle] - {PR_MERGE_DATE}

- Added a "Toggle Mirroring" action (and a standalone hotkey-able command) that turns mirroring off if it's on, or on if it's off, using a configurable default direction.
- Bound the in-list "Toggle Mirroring" action to ⌘T for quick access.

## [New Features & Bugfixes] - 2026-04-02

- Modernized UI to use a full-page Raycast List view instead of a background shortcut.
- Added ability to choose which display mirrors which (Mac -> External or External -> Mac).
- Migrated underlying logic to a stable CoreGraphics Swift script (replaces AppleScript keyboard emulation that caused brightness issues).
- Gracefully handles multiple external displays as well as zero external display states.

## [Initial Version] - 2025-01-16
