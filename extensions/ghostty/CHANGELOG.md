# Ghostty Changelog

## [Edit Ghostty Config] - 2026-03-25

- Add new command to view and edit the Ghostty configuration file (`~/.config/ghostty/config`)
- Settings are grouped by category: Font, Colors, Cursor, Window, macOS, Mouse & Scroll, Clipboard, Shell, and more
- Color values are rendered as live color swatches directly in the list
- Edit any value inline with a form — enum options (like `cursor-style`, `window-theme`) use a dropdown
- Browse all available Ghostty options and add missing ones directly to your config

## [Fix] - 2026-03-25

- Fix "Open with Ghostty" to open the selected Finder item (file or folder), not just the current window directory
- Support files (opens parent directory), folders, multiple selections, and Path Finder
- Remove `run-applescript` dependency; use `runAppleScript` from `@raycast/utils`

## [Feature] - 2026-03-24

- Use new Ghostty AppleScript API
- Add new command to list git repos in a directory and open with your launch configuration

## [Command] 2025-03-13

- Add new command to open currently selected Finder directory in new Ghostty Window

## [Command] - 2025-02-23

- Run launch configurations split pane bug fix

## [Command] - 2025-02-21

- Add new command to store and run launch configurations

## [Feature] - 2025-01-20

- Add new command to list all tabs and go to the selected

## [Initial Version] - 2025-01-08
