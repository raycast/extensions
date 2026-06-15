# Changelog

## [Support SQL Format Dialect] - 2026-01-22
### Added New Features
- Added new Preference "SQL Dialect" to select for user, the default value is "sql" as same as old

### Changed
- upgrade sql-formatter from 15.4.0 to 15.7.0 to support ClickHouse SQL
- fix some spelling error
- fix autoPaste Description error, from "formatted JSON" to "formatted SQL"
- add CHANGELOG for this change
- add WebStorm(.idea) ignore in .gitignore file

## [Added SQL Format Preview] - 2025-05-26
### Added New Features
- Added new command "Format SQL" for formatting SQL with visual interface.
- Added new command "Format Selected SQL Preview" for previewing formatted SQL in new window

### Changed
- Enhanced user interface with better feedback
- Updated documentation with new features and code comments.

## [Initial Version] - 2024-08-28

- Added a comment to format a SQL clause string stored in clipboard and copy/paste it back.
- Added new command to format sql clause selected in the foremost editor.
