# Word Count Changelog

## [New Feature] - 2026-01-28

- Create new command to show overlay rather than open raycast window
- Is meant for quickly checking word count without being intrusive, keeping the current app in focus

## [Update] - 2026-01-27

- Add Raycast Cross-Extension badge to readme

## [New Feature] - 2026-01-19

- **Added screenshot-based word counting** - Capture any text on screen and get instant counts using OCR
  - New "Count from Screenshot" command (macOS only)
  - Uses [ScreenOCR](https://www.raycast.com/huzef44/screenocr) extension via cross-extension integration
  - Displays results in HUD notification
- Updated dependencies to the latest Raycast stack
- Updated ESLint tooling to v9 using the provided guide

## [Update] - 2025-04-07

- Added logic for properly counting CJK characters as "words"

## [Moved contributor] - 2024-04-15

- No changes were made in the code.

## [Improvements] - 2023-01-21

- Added passing the selected text to the form

## [Update] - 2023-08-22

- Added reading and speaking time ⌛

## [Update] - 2022-11-21

- Updated action panel hotkey from ⌘ + W to ⌘ + T due to collision.

## [Whitespace Preset] - 2022-11-01

- Whitespace is now included in the word count by default.

## [Created Word Count] - 2022-07-27

Initial release 🎉
