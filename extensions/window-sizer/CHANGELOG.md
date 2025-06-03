# Window Sizer Changelog

## [Chore] - 2025-06-03

- Fixed store page styling

## [Chore] - 2025-06-03

- Fixed navigation title for the resize window command

## [Refactor Favorite Size Feature] - 2025-05-30

- Refactored the logic for saving and resizing to the favorite window size
- Removed the Reset Favorite Size command — favorite size is now configured directly in the command settings
- Renamed the command from "Resize to Favorite Size" to "Apply Favorite Size"

## [New Feature and Improvements] - 2025-05-28

- Added a new command to quickly save and resize to a favorite window size
- Cleaned up default sizes

## [Chore] - 2025-05-26

- Cleanup of internal HUD navigation logic

## [Fixes] - 2025-05-23

- Fixed occasional issue with action icon not displaying

## [UI improvement] - 2025-05-21

- Adjusted Action icon to only display when selected

## [Starred Sizes & Improvements] - 2025-05-19

- Added starring for frequently used window sizes
- Unified shortcut keys for Deleting Custom and Starred Sizes
- Improved action icons

## [New Action Icons] - 2025-05-12

- Added new action icons

## [Fixes] - 2025-05-08

- Fixed the delete icon tooltip text on custom size list items

## [Update Extension Icon] - 2025-05-07

- Updated extension icon and screenshots

## [Fixes] - 2025-05-06

- Fixed toast text when restoring a window with restricted size
- Unified toast text style

## [Refactored entirely in Swift] - 2025-05-05

- Fully rewrote the extension in Swift for better maintainability and performance
- Enhanced Maximize Window to support all connected screens
- Improved screen edge detection to ensure precise window resizing
- Various performance and UX improvements

## [New Features & Fixes] - 2025-04-28

- Enabled maximizing the active window
- Added support for displaying the current window size
- Fixed incorrect positioning when restoring a saved size
- Improved toast behavior when the size exceeds the screen
- Suppressed redundant toast when saving the same size again

## [Initial Version] - 2025-04-25

- First release of Window Sizer
- Support for quick window resizing to predefined sizes
- 8 pre-configured window sizes (2560×1600 to 800×600)
- One-click application of common window sizes
- Custom window size creation and saving
- Previous window size restoration
