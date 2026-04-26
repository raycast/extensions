# Craftdocs Changelog

## [Reliability and UX improvements] - 2026-04-08

- Prevented issues when Craft is missing, not set up yet, or still syncing its local data.
- Improved reliability when Craft search data is unavailable or only some Spaces are available locally.
- Added clearer states across `Search Blocks`, `Daily Notes`, `Manage Spaces`, and `Add to Daily Note`, including a fallback that copies your content and opens today's Daily Note when it can't be found automatically.
- Fixed Space selection so `Search Blocks` and `Daily Notes` switch to a valid enabled Space when a previously selected Space is disabled or unavailable.
- Fixed `Search Blocks` so creating a new Document uses the currently selected Space.
- Preserved existing Space names and enabled settings more reliably, and improved setup guidance for renaming Spaces.
- Refined wording throughout the extension for clearer, more consistent guidance.

## [Feature] - 2025-08-11

- Added a new `Add to Daily Note` command with intelligent Daily Note detection and configurable append/prepend position.
- Added timestamp toggle and customizable prefix/suffix options for flexible content formatting.
- Added Space Management functionality with new `Manage Spaces` command
- Added ability to rename Spaces with custom names instead of Space IDs
- Added Space enable/disable functionality to hide unused Spaces extension-wide
- Added Space filtering dropdowns in Block Search and Daily Notes commands
- Added persistent Space settings that sync across all commands
- Improved visual distinction between Documents and Blocks with better icons (Document vs Text)
- Fixed React key conflicts when multiple Spaces contain Blocks with identical names
- Enhanced user experience with consistent Space naming throughout the extension
- Updated dependencies via `npm audit fix`

## [Security] - 2024-11-12

- Updated dependencies via `npm audit fix` to address 4 vulnerabilities (2 moderate, 2 high).

## [Update] - 2023-02-11

- Added support for setapp version.

## [Update] - 2022-07-12

- Added a new `Daily Notes` command.

## [Update] - 2022-07-09

- Updated icons in the list.

## [Bug fix] - 2022-05-27

- Narrow the scope for opened SQLite databases;
- Catch exceptions from SQLite if such happens.

## [Initial Version] - 2022-05-23
