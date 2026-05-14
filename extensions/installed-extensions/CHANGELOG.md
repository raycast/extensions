# Installed Extensions Changelog

## [Sort by Recently Updated] - 2026-04-24

- Add `Sort By` preference with `Title (A–Z)` (default) and `Recently Updated` options to quickly spot extensions refreshed by "Check for Updates"
- Add a `Just Updated` tag when an extension was updated in the last hour so you can find fresh updates at a glance even when sorting alphabetically
- Add `Show in Finder` / `Show in Explorer` action to reveal the extension folder (useful for local extension development)
- Persist the `Extension Type` filter across launches (`storeValue`)
- Skip malformed or unreadable extension manifests gracefully instead of failing the entire list

## [Cross-plaform Keyboard Shortcuts] - 2026-01-05

- Update `shortcut`s to be cross-platform

## [Enhancement] - 2025-11-15

- Add icon path for Windows

## [Enhancement] - 2025-10-08

- Add support for Windows
- Bump all dependencies to the latest

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
