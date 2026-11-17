# Blip Changelog

## [Choose recipients, send text and clipboard, manage transfers] - {PR_MERGE_DATE}

- Talk to Blip's engine directly instead of driving Finder's Services menu: no Blip windows open and no Accessibility permission is needed
- Choose the recipient: your other devices (with online status), your contacts, or anyone on Blip by name or email
- Send text and the clipboard (copied files, text or images), and multiple files and folders at once
- New Manage Transfers command: live progress and speed, accept or decline, pause, resume, cancel, open received files, clear history
- Blip's settings (auto-accept, save to Photos, save location, speed limits) in the extension preferences
- Send asks what to send first, then who, and names the content on every button
- Quick Send: pick one recipient, then send the clipboard or Finder selection to it from a hotkey, with no window
- Start Blip in the background when it isn't running

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
