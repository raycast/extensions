# Window Sizer Changelog

## [Update] - 2025-04-28

- Feature: Maximize Window
- Feature: Get Current Size
- Fix: Position of the window when restoring previous size
- Fix: Toasts when size exceeds the screen
- Fix: Toast when adding a size identical to the current size

## [Update] - 2025-04-25

- Fixed handling of window size addition when no window is in focus
- Improved toast notification for Restore Previous Size when no focused window

## [Update] - 2025-04-25

- Added loading state to prevent list flicker during data fetching
- Improved error handling for AppleScript operations
- Refactored window info retrieval into a shared utility function
- Enhanced logging messages for better debugging
- Fixed window size restoration logic

## [Update] - 2025-04-25

- Improved window positioning logic during resize
- Enhanced previous window size restoration

## [Update] - 2025-04-25

- Remove the default size in the add page
- Fix typo in the add page

## [Update] - 2025-04-25

- Fix toast emoji

## [Initial Version] - 2025-04-25

### Features

- First release of Window Sizer
- Support for quick window resizing to predefined sizes
- 8 pre-configured window sizes (2560×1600 to 800×600)
- One-click application of common window sizes
- Custom window size creation and saving
- Previous window size restoration
