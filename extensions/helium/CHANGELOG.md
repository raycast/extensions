# Helium Changelog

## [Initial Version] - 2025-10-30

## [Fix Search Tab Switching] - 2026-04-23
AppleScript to switch tabs was not running due to `closeMainWindow()` in actions.tsx killing the process before. Fix was to move `closeMainWindow()` to **after** the AppleScript succeeds.
Removed experimental logic for switching searched tab from another space. New AppleScript now will switch to the space where browser is and switch to tab. 