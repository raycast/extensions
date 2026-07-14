# Blip Changelog

## [Added Windows support] - 2026-06-04

- Added cross-platform support for Windows via PowerShell automation
- File Explorer selection detection on Windows using Shell.Application COM automation
- Blip invocation on Windows via registered shell context menu verb
- Platform-aware UI strings: "Finder" on macOS, "File Explorer" on Windows

## [Bug Fixes] - 2026-05-05

- Fix triggering Blip from Finder Services on localized macOS systems.

## [Initial Release] - 2026-04-13

- Add the initial Blip extension
- Send the current Finder selection to Blip
- Pick a file or folder in Raycast and send it to Blip
