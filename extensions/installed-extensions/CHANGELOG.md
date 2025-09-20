# Installed Extensions Changelog

## [Maintenance] - 2025-08-28

- Use the Raycast built-in `Action.CopyToClipboard` instead of manually copying to clipboard and showing HUD

## [Enhancement] - 2025-08-26

- Add support for launching target extension
- Bump all dependencies to the latest

## [Enhancement] - 2023-12-21

- Add `Open Manifest in <App>` action to open the extension manifest in the default app

## [Enhancement] - 2023-11-01

- Added tag to see if it's private extension
- Added last modified time
- Added Open in Browser action

## [Enhancement] - 2023-10-31

- Remove using `exec` calling `find`
- Fix broken types

## [Enhancement] - 2023-10-27

- Removed `jq` as dependency

## [Improvements] - 2023-10-24

- Fixed typos
- Fixed a logic bug that showed store extensions as local extensions
- Now it also checks the default `jq` path if installed with homebrew using an Intel-based Mac

## [Initial Version] - 2023-10-12
