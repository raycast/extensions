# Window Sizer Changelog

## [Fixes] - {PR_MERGE_DATE}

- Replaced some failure-style `showToast` with `showFailureToast`
- Corrected extension icon and screenshots display

## [Fixes] - 2025-05-08

- Fix the delete icon tooltip text on custom size list items

## [Update Extension Icon] - 2025-05-07

- Update extension icon and screenshots

## [Fixes] - 2025-05-06

- Fix toast text when restoring a window with restricted size
- Unify toast text style

## [Refactored entirely in Swift] - 2025-05-05

- Fully rewrote the extension in Swift for better maintainability and performance
- Enhanced Maximize Window to support all connected screens
- Improved screen edge detection to ensure precise window resizing
- Various performance and UX improvements

## [New Features & Fixes] - 2025-04-28

- Enabled maximizing the active window
- Supported fetching and displaying the current window size
- Resolved incorrect positioning when restoring a saved size
- Improved toast behavior when the size exceeds the screen
- Suppressed redundant toast when saving the same size again

## [Initial Version] - 2025-04-25

- First release of Window Sizer
- Support for quick window resizing to predefined sizes
- 8 pre-configured window sizes (2560×1600 to 800×600)
- One-click application of common window sizes
- Custom window size creation and saving
- Previous window size restoration
