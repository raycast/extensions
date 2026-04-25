# Helium Changelog

## [Fix Search Tab Switching] - 2026-04-25

- AppleScript to switch tabs was not running due to `closeMainWindow()` in actions.tsx killing the process before. Fix was to move `closeMainWindow()` to **after** the AppleScript succeeds.
- Removed experimental open/close-tab workaround for cross-Space switching. Tab switching now uses the `select` AppleScript command added upstream in [helium-macos#126](https://github.com/imputnet/helium-macos/pull/126), which natively switches to the Space the Helium window lives on and focuses the matching tab. Requires a Helium build that includes that patch.

## [Initial Version] - 2025-10-30
