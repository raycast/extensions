# Fathom for Raycast Changelog

## Lazy Pagination & Smart Cache - {PR_MERGE_DATE}

### Added

- **Lazy pagination**: Load ~50 meetings initially, ⌘-L to fetch 50 more on demand
- **Smart cache refresh**: 5-minute staleness detection for automatic background refresh
- **Full-text search**: Search across meeting titles, summaries, and transcripts
- **Cursor-based pagination**: Maintains position across sessions for incremental loading
- **Load more action**: "Load Older Meetings" (⌘-L) with dynamic visibility based on availability

### Changed

- **Direct HTTP API**: Removed `fathom-typescript` SDK dependency for better control
- **Improved toast messages**: Clearer distinction between "Fetching from API" and "Saving to cache"
- **Instant loading**: Cached meetings display immediately while fresh data loads in background
- **Cache architecture**: New `cacheManager.ts` with pagination state and staleness tracking
- **Removed extraneous docs**: relocated a bunch of leftover docs that are no longer relevant

### Fixed

- **Performance**: Eliminated redundant API calls on every search/launch with 5-min cooldown
- **UX clarity**: Toast messages now clearly indicate what's happening (fetching vs caching vs ready)
- **SDK issues**: Resolved SDK validation failures by using direct HTTP requests

## [Update] - 2026-02-10

- Updated dependencies
- Removed `calendarInvitees` parameter from SDK call with explanatory comment about HTTP fallback

## [Improve Full-Text Search] - 2025-12-25

- Fixed `get-meeting-details` tool to paginate through all meetings when searching by title
- Changed "Refresh Cache" shortcut to use `Keyboard.Shortcut.Common.Refresh` for Raycast consistency

## [Update to Fathom SDK 0.0.36] - 2025-11-09

### Changed

- Updated `fathom-typescript` dependency from 0.0.30 to 0.0.36
- Improved SDK integration with better error handling and validation
- Added fallback to HTTP requests when SDK validation fails

### Fixed

- Fixed TypeScript type safety issue with async iterator responses in `listMeetings`
- Enhanced error handling for edge cases in API responses

## [Initial Version] - 2025-10-19
