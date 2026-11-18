# Screenshot Changelog

## [Fix false timeout error in All In One command] - 2026-09-16

- Fixed the All In One command showing a "Could not launch Screenshot app – Command timed out after undefined milliseconds" error after every capture. The AppleScript `activate` event never returns while the Screenshot.app UI is up, so the command now launches it with `open -a Screenshot`, which returns immediately and still works on macOS Tahoe.

## [Fix All In One command on macOS Tahoe] - 2026-01-14

- Fixed All In One command not working on macOS Tahoe by using AppleScript to activate Screenshot.app

## [Fix documentation] - 2025-09-04

- Fixed description for capture-to-clipboard command to be more accurate

## [Add Capture Window To Clipboard command] - 2023-09-14

- Added Capture Window To Clipboard command

## [Initial Release] - 2022-12-15

- Added All in one command.
- Added Annotate command.
- Added Capture Area command.
- Added Capture Fullscreen command.
- Added Capture Timer command.
- Added Capture Window command.
- Added Capture and Copy command.
