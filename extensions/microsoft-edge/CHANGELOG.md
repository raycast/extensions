# Microsoft Edge Changelog

## [Fix New Tab + Modernize] - 2025-08-04

- Fix: **New Tab** command would crash (ref: [Issue #16017](https://github.com/raycast/extensions/issues/16017))
- Modernize to use latest Raycast configuration
- Specify extension is "MacOS" only due to use of `AppleScript`

## [Enhancements] - 2024-12-03

- Replace `run-applescript` with Raycast's own
- Hide "Install with Homebrew" `Action` during installation otherwise it is possible to run the Action multiple times
- New "Copy Active Tab URL" command allows you to easily copy the active URL to Clipboard

## [Multiple fixes and new features] - 2023-07-14
- Added Stable, Dev, Beta and Canary build support
- Fix all bugs reported
- Remove unsafe JS command execution
- Correct error notification
- Removed useDev support previously added


## [Enhancement] - 2023-03-22

- add useDev support Microsoft Edge Dev

## [Profiles support] - 2023-01-25

- Added support for profiles across all commands
- Added support for opening tabs in different profiles

## [Initial Version] - 2021-11-22

- Add Microsoft Edge extension
