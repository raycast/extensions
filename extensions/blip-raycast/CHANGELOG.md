# Blip Changelog

## [Send Without Opening Blip and Manage Transfers] - 2026-11-21

- Send directly through the Blip app's engine: Blip's windows never open and no Accessibility permission is needed
- Choose the recipient in Raycast: your other devices (with online status), your contacts, or anyone on Blip by name or email
- Send text, the clipboard (text, an image or copied files), and several files and folders at once
- **Send Anything** (formerly *Send to Blip*) asks what to send first, then who, and names the content on every action
- **Send Selected Files** (formerly *Send Selected File to Blip*) now lets you choose the recipient
- New **Send Clipboard** command
- New **Quick Send Clipboard** and **Quick Send Selected Files** commands: send to a remembered recipient from a hotkey, without a window
- New **Manage Transfers** command: progress and speed, accept or decline, pause, resume, cancel, open received files and clear history
- Blip's settings (auto-accept, save to Photos, save folder, speed limits) in the extension preferences
- Start Blip in the background when it isn't running
- Windows: talks to the Blip app through a small Rust helper, so all of the above works there too

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
