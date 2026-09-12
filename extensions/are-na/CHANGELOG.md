# Are.na Changelog

## [Expand Commands and AI Tools] - 2026-09-12

- Added a dark-theme command icon so the Are.na mark stays visible on dark Raycast chrome.
- Added multiline text previews to block grids, with light and dark appearances.
- Added Create Block to save URLs or text to multiple channels and Open Are.na Link to view channels and blocks directly in Raycast.
- Expanded AI tools with block creation and editing, channel editing, connections, user browsing, and sampled channel digests.
- Added content type filters to AI search, channel descriptions during creation, and Are.na URL support for lookups and destinations.
- My Channels now loads beyond the first 100 results; AI lists expose pagination and long block details identify truncated text.
- Fixed text block edits and prevented nested channels from showing block deletion actions, while keeping Remove from This Channel available for nested connections.

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
