# Dia Changelog

## [Performance and Features] - 2026-02-24

### Performance

- Replace nested AppleScript repeat loops with JXA (JavaScript for Automation) with bulk AppleScript fallback using `properties of every tab` for 10-14x faster tab fetching
- Switch `useTabs()` from `usePromise` to `useCachedPromise` for instant subsequent launches
- Add `throttle={true}` to Search and Search History views to reduce SQL queries during typing
- Progressive UI loading: tabs render immediately, history/bookmarks/suggestions stream in independently

### Added

- **Open URL in Dia**: New no-view command to open a URL in Dia with argument, clipboard fallback, and Google search for non-URLs
- **URL detection in Search**: Typing a URL shows "Open [url]" as the first result with default action to open in Dia
- **Better default tab action**: Enter opens a new tab (faster), Cmd+Enter focuses the existing tab

## [Search Bookmarks: Open all in folder] - 2026-02-02

- Added "Open All # in Dia" action on bookmark folders to open all bookmarks in that folder (and subfolders) as tabs in Dia for quick access to a bookmarked set of tabs; Raycast window closes after opening to keep user in flow.

## [Handle error in Search History + Fix CHANGELOG Dates] - 2025-12-25

- Handle error in Search History when file is not found
- Fix the format of CHANGELOG to render dates properly

## [Bookmarks improvement and fix] - 2025-12-11

- Added Bookmarks in the global Search command (in addition to tabs, browser history and google suggestions)
- Use Action.Open to open bookmarks instead of AppleScript (fix #23370 #23352 #23340 #23329)

## [Search Open and Pinned Tabs] - 2025-12-01

- Added support for Dia's new AppleScript API to search open and pinned tabs.

## [New Features] - 2025-11-27

### Added

- **Search History**: Search and open browser history entries with advanced search syntax
- **Search Bookmarks**: Browse bookmark folders with full hierarchy support and global search
  - Folder navigation with breadcrumb paths
  - Advanced search syntax (supports include/exclude terms with `-` prefix)
  - Search results display bookmark location paths

### Known Issues

- **Search Tabs**: Currently unavailable due to Dia browser's limited AppleScript support
  - Note: Expected to be supported in Dia's next version

## [Fix Description] - 2025-04-29

- Updated the description to fix grammatical issues

## [Initial Version] - 2025-04-28
