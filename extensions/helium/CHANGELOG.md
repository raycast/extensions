# Helium Changelog

## [Initial Version] - 2025-10-30

## [Fix Search Tab Switching] - {PR_MERGE_DATE}
AppleScript to switch tabs was not running due to `closeMainWindow()` in actions.tsx killing the process before. Fix was to move `closeMainWindow()` to **after** the AppleScript succeeds.