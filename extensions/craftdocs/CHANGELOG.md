# Craftdocs Changelog

## [Feature] - 2025-08-11

- Added a new `Add to Daily Note` command with intelligent daily note detection and configurable append/prepend position.
- Added timestamp toggle and customizable prefix/suffix options for flexible content formatting.
- Added Space Management functionality with new `Manage Spaces` command
- Added ability to rename spaces with custom names instead of Space IDs
- Added space enable/disable functionality to hide unused spaces extension-wide
- Added space filtering dropdowns in Block Search and Daily Notes commands
- Added persistent space settings that sync across all commands
- Improved visual distinction between documents and blocks with better icons (Document vs Text)
- Fixed React key conflicts when multiple spaces contain blocks with identical names
- Enhanced user experience with consistent space naming throughout the extension
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
