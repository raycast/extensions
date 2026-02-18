# Fathom for Raycast Changelog

## [Lazy Pagination & Smart Cache] - {PR_MERGE_DATE}

### Added

- **Lazy pagination**: Load ~50 meetings initially, then fetch 50 more via native Raycast List pagination on scroll
- **Smart cache refresh**: 5-minute staleness detection for automatic background refresh
- **Full-text search**: Search across meeting titles, summaries, and transcripts
- **Cursor-based pagination**: Maintains position across sessions for incremental loading
- **Native pagination UX**: Removed manual "Load Older Meetings" action in favor of Raycast List pagination

### Changed

- **Direct HTTP API**: Removed `fathom-typescript` SDK dependency for better control
- **Improved toast messages**: Clearer distinction between "Fetching from API" and "Saving to cache"
- **Instant loading**: Cached meetings display immediately while fresh data loads in background
- **Cache architecture**: New `cacheManager.ts` with pagination state and staleness tracking
- **Removed extraneous docs**: Relocated leftover docs that are no longer relevant
- **Pagination `pageSize`**: Corrected from `50` to `20` to match Raycast's documented intent (placeholder skeleton count, not data batch size)
- **Pagination `hasMore` initial state**: Initialized synchronously from `cacheManager.hasMore()` so Raycast sees the correct value on first render, preventing the pagination trigger from being suppressed
- **Updated `@raycast/api`** to `1.104.6`

### Fixed

- **Performance**: Eliminated redundant API calls on every search/launch with 5-min cooldown
- **UX clarity**: Toast messages now clearly indicate what's happening (fetching vs caching vs ready)
- **SDK issues**: Resolved SDK validation failures by using direct HTTP requests
- **Code duplication**: Extracted shared `CachedMeetingData → Meeting` mapping into a single `toMeeting` helper in `useCachedMeetings`
- **Redundant state**: Removed duplicate `hasMoreMeetings` state and `isLoadingMoreRef` from `search-meetings.tsx` (already handled in the hook and `cacheManager`)

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
