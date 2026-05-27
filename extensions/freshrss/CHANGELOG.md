# Changelog

All notable changes to the FreshRSS Raycast extension will be documented in this file.

## [1.1.1] - {PR_MERGE_DATE}

### Fixed

- Add missing `bcryptjs` and `node-html-markdown` dependencies to `package.json`
- Add `debugLogging` preference to the preferences schema (referenced in code but previously undefined)

## [1.1.0] - 2026-05-26

### Added

- Random Article command (`random-article`) — opens a random article from all feeds with a "shuffle" action to get another
- Mark Read on Readwise Save preference — automatically mark articles as read when saving to Readwise Reader
- `getAllArticles` API function for fetching the full reading list without read/unread/starred filters

### Fixed

- Auto mark-as-read not triggering when selecting articles in the list view — it only worked when pushing into the detail view; now marks articles as read on selection via `onSelectionChange`

## [1.0.1] - 2026-05-25

### Fixed

- Stream contents endpoint returning "Not Found" errors due to `encodeURIComponent` encoding slashes in stream IDs (e.g. `user/-/label/Tech`) — FreshRSS expects these as literal path segments
- Spurious "API endpoint not found" errors caused by a body-content check that matched any response containing the substring "Not Found" (e.g. articles with that phrase in their title/content)
- Search articles returning all articles instead of filtered results — the `q` query parameter is not supported by FreshRSS's Google Reader API; replaced with client-side filtering across title, summary, author, URL, and feed title
- Removed unused `FreshRSSSearchItemsResponse` type

## [1.0.0] - 2026-05-25

### Added

- Save to Readwise integration for articles
- Article detail view for reading full content
- Search articles command (`search-articles`) with full-text search across all feeds
- `searchArticles` API function
- Refresh feeds command (`refresh-feeds`) with cache clearing
- `refreshFeeds` API function
- Category selection when adding feeds
- Keyboard shortcuts for open article, copy URL, and copy ID
- Article actions (mark read/unread, star/unstar) in detail view
- Feed drill-down from category and unread views
- Optimistic UI updates for mark-as-read and star/unstar actions
- Mark all as read action
- Feed editing support
- Unread count badges on feeds and categories
- Dashboard view with unread overview
- Auto mark-as-read preference (optional)
- Browse by Category command (`browse-categories`)

### Fixed

- Search functionality returning incorrect results
- Category adding flow not working properly
- Refresh feeds not clearing cache correctly
- Extension authentication and connection issues
- Limitations in the initial Google Reader API implementation

### Changed

- Updated extension icon
- Anonymized documentation links
- Removed copy article ID action (replaced by copy URL)
- Updated dependencies (`@raycast/api`, `@raycast/utils`, `typescript`)

## [0.1.0] - Initial Release

### Added

- List Feeds command (`list-feeds`)
- Add Feed command (`add-feed`)
- Remove Feed command (`remove-feed`)
- Unread Articles command (`unread-articles`)
- Read Articles command (`read-articles`)
- Starred Articles command (`starred-articles`)
- FreshRSS Google Reader API client with authentication
- Preferences for base URL, username, and API password