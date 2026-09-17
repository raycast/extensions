# Soundboard Changelog

## [Fix] - 2026-08-14

- Fixed "ReferenceError: crypto is not defined" when saving a sound by replacing `nanoid` with `randomUUID` from `node:crypto`

## [Enhancement] - 2026-08-13

- Add support for Windows platform using Rust
- Add Stop action for currently playing sounds
- Add icons for sound entries
- Bump all dependencies to the latest

## [Enhancement] - 2026-01-09

- Added "Close the Raycast window after triggering a sound" option to preferences

## [Fix] - 2023-12-08

- Fixed Move Down hotkey

## [Fix] - 2023-10-25

- Fixed a bug where files with space in the name was not working 

## [Enhancement] - 2022-11-17

- Updating the subtitle on favorite commands to show if it’s assigned to a sound
- Added so it's possible to sort the sounds order in the list 

## [Initial Version] - 2022-11-10
