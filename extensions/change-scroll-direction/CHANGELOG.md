# Changelog

## [Improvements] - {PR_MERGE_DATE}
- Switch from System Settings UI automation to the `setSwipeScrollDirection` function the Trackpad pane itself calls, so the change applies instantly without opening System Settings.
- Drop the Accessibility permission requirement and the per-macOS-version AppleScripts.
- Report the resulting state in the HUD, so you can tell which direction you just switched to.

## [Fix] - 2025-11-24
- Fix `change-scroll-direction` extension for MacOS Tahoe 26 and above.
