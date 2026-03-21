# Dia Changelog

## [Fix tab fetching and JSON parsing] - 2026-03-12

- Fix unescaped quotes in JSON from AppleScript so tab data parses correctly
- When JXA returns 0 tabs but Dia has windows, fall back to AppleScript bulk fetch
- Handle missing value in AppleScript escape_value to avoid errors

## [Performance and Features] - 2026-03-10

### Performance

- Replace nested AppleScript repeat loops with JXA (JavaScript for Automation) with bulk AppleScript fallback using `properties of every tab` for 10-14x faster tab fetching
- Switch `useTabs()` from `usePromise` to `useCachedPromise` for instant subsequent launches
- Debounced search: expensive operations (history SQL, Google API, bookmarks I/O) use 200ms debounce while tab filtering and URL detection remain instant
- Progressive UI loading: tabs render immediately, history/bookmarks/suggestions stream in independently
- Skip history and Google queries for single-character searches
- Defer VersionCheck: show content immediately instead of blocking render while checking Dia version
- Cache bookmarks tree with `useCachedPromise` and `keepPreviousData` to avoid re-reading file on every search
- Replace `focusTab()` nested AppleScript loops with JXA for faster tab switching
- Remove `dedent` dependency to reduce cold start time

### Added

- **Open URL in Dia**: New no-view command to open a URL in Dia with argument, clipboard fallback, and Google search for non-URLs
- **URL detection in Search**: Typing a URL shows "Open [url]" as the first result with default action to open in Dia
- **Tab action preference**: Choose default Enter action (Focus Existing Tab or Open in New Tab) via extension preferences. Defaults to Focus Existing Tab

## [Update Raycast Utils] - 2026-03-06

- Updated `@raycast/utils` from `^2.2.2` to `^2.2.3`.

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
