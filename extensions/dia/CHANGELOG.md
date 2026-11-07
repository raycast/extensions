# Dia Changelog

## [Search Extensions Command] - 2026-11-07

- Added a Search Extensions command that lists the browser extensions installed in every Dia profile, grouped by profile in Dia's order. Each section shows the profile's extension count and which profile is active, and every extension shows its profile in the profile's Dia color.
- Open Extension switches the front window to the extension's profile and picks the extension from Dia's Extensions menu, which opens it like its toolbar button. Requires Accessibility access for Raycast.
- When the Extensions menu has no item for the extension, its popup (or, without one, its settings page) opens in a new tab instead.
- Added actions to open an extension's popup or settings page in a new tab and to copy its ID, and a profile filter (⌘P) that marks the active profile. Built-in extensions are hidden unless enabled in the command preferences.

## [Search Tabs Across Spaces] - 2026-11-07

- Search Tabs now lists tabs from every Dia space, not only the space active in each window.
- With more than one space, tabs are grouped by space in Dia's order. Each section shows the space's tab count and which space is active, and every tab shows its space in the space's Dia color, as a name or a dot (new "Space Label" preference, default name).
- A dropdown (⌘P) filters by space, showing each space's color and marking the active space. The last choice is remembered.
- Added "Switch to Space" actions (⌘K) that switch the tab's Dia window to another space.
- Focus and Close find tabs in any space; focusing a tab from another space switches its window to that space.
- Tabs load faster: tab fetching now uses the bulk AppleScript path first.
- Focusing a tab that was already closed now shows an error instead of failing silently.

## [Update Icon] - 2026-11-07

- Updated the extension icon to match the current Dia app icon, with a dark mode variant.

## [AI Tools: Tabs, History and Bookmarks] - 2026-10-10

- Added AI tools to list open tabs, get the focused tab, and search browsing history and bookmarks.
- History and bookmark searches return 50 results by default, up to 100.

## [AI Tool: Read Tab Contents] - 2026-10-10

- Added an AI tool that reads the visible text of a tab or the focused tab, truncated to 20,000 characters by default.
- Requires Dia to be launched with `--enable-applescript-javascript`; the tool explains how when it isn't.

## [AI Tools: Open URLs and Manage Tabs] - 2026-10-10

- Added AI tools to open a URL or web search, switch to a tab, and close a tab.
- Closing a tab asks for confirmation first.

## [Security: Address dependabot alert] - 2026-08-19

- Updated package-lock.json to fix https://github.com/raycast/extensions/security/dependabot/76383

## [Close Tab] - 2026-08-18

- Added Close Tab action to Search Dia and Search Tabs.

## [Configurable Search Engine] - 2026-06-11

- Added a search engine preference for Search Dia suggestions and web search fallback actions.

## [Fix bookmark opening] - 2026-05-21

- Fixed bookmark results failing to open in Dia on newer Dia versions.

## [Fixed SQL query escaping] - 2026-03-27

- Fixed single quote escaping in SQL queries to use proper SQL string literals instead of double quotes

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
