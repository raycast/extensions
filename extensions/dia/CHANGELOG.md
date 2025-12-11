# Dia Changelog

## Bookmarks improvement and fix - 2025-12-11

- Added Bookmarks in the global Search command (in addition to tabs, browser history and google suggestions)
- Use Action.Open to open bookmarks instead of AppleScript (fix #23370 #23352 #23340 #23329)

## Search Open and Pinned Tabs - 2025-12-01

- Added support for Dia's new AppleScript API to search open and pinned tabs.

## New Features - 2025-11-27

### Added

- **Search History**: Search and open browser history entries with advanced search syntax
- **Search Bookmarks**: Browse bookmark folders with full hierarchy support and global search
  - Folder navigation with breadcrumb paths
  - Advanced search syntax (supports include/exclude terms with `-` prefix)
  - Search results display bookmark location paths

### Known Issues

- **Search Tabs**: Currently unavailable due to Dia browser's limited AppleScript support
  - Note: Expected to be supported in Dia's next version

## Fix Description - 2025-04-29

- Updated the description to fix grammatical issues

## [Initial Version] - 2025-04-28
