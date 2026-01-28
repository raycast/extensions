# Terminal Finder Changelog

## [Better "Finder" Errors] - 2026-01-12

- Show a better error message when no **Finder** window open or when trying to pass non-filesystem folder (e.g. **Recents**) (ref: [Issue #24386](https://github.com/raycast/extensions/issues/24386))

## [Fix Kitty Casing] - 2026-01-12

- Fix "Kitty" terminal not working due to different casing (ref: [Issue #24377](https://github.com/raycast/extensions/issues/24377))

## [Enhancements] - 2026-01-05

- A new quick command to jump from X to Y
- Added README.md
- Added support for Kitty
- Updated `command` `description`s to be more precise
- Added error handling in existing `runAppleScript`

## [Update] - 2024-12-29

- Added support for Ghostty

## [Update] - 2024-02-05

- Added support for WezTerm

## [Update] - 2023-03-02

- Updated `@raycast/api`
- Removed `run-applescript`
- Unset `LC_ALL` environment variable before running AppleScripts in order to avoid localization errors when starting the terminal application.

## [Update] - 2022-11-18

- Updated `@raycast/api`
- Added clipboard to terminal commands
