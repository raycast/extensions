# OwnDrop Changelog

## [Copy & Drop and Setup Guide] - {PR_MERGE_DATE}

- Added Copy & Drop to copy selected text, links, or files to the clipboard and send them to OwnDrop, with progress and partial failure reporting for multiple files. File selection works in Finder and the active File Explorer tab.
- Renamed the existing commands to Drop Clipboard and Browse Drops while preserving their command IDs and hotkeys.
- Added illustrated connection and command guides, optional hotkey examples, and setup help in Raycast preferences.

## [Initial Version] - 2026-11-27

- Added **Drop** command to automatically send clipboard text, links, or files to your OwnDrop instance, with manual text/file fallback.
- Added **Browse** command to search, copy, preview, open links, play media, pin, download, and delete drops across macOS and Windows.
- Added cached results, debounced server search, background refresh, pin-first ordering, and authenticated image previews.
