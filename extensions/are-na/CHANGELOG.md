# Are.na Changelog

## [Updates] - 2026-04-23

- Migrated API integration to Are.na `v3` with unified pagination and error handling.
- Added new commands:
  - `Search Everything`
  - `My Profile`
  - `My Channels`
- Upgraded discovery commands (channels, blocks, users) with sort controls and incremental pagination.
- Added saved/recent search workflow in extension storage.
- Added block management actions: edit, connect to channels, remove from current channel, and delete.
- Added channel management actions: edit metadata/visibility, manage collaborators, and delete safeguards.
- Added AI Extensions support for the extension

## [Show Channel Status] - 2025-07-07

- "Search Channels" has an extra _status_ accessory (ref: [Issue #20037](https://github.com/raycast/extensions/issues/20037)):
  1. private: `Icon.EyeDisabled` in `Red`,
  2. public: `Icon.Eye` in `Green`,
  3. closed: `Icon.Eye`,

## [Initial Version] - 2025-05-16
