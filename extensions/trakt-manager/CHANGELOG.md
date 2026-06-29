# Trakt Manager Changelog

## [Update] - 2026-06-29

### Added

- **Search Media** command — search movies and TV shows in a single query, with results from both Trakt search endpoints merged into one grid. Reduces friction for users who previously had to run separate Search Movies and Search Shows commands to find what they want.
- **All** filter for **History** — view movie and episode history together in one timeline, sorted by watch date (newest first). Matches how Trakt.tv presents history and avoids switching filters to see recent activity across both media types.
- **All** filter for **Watchlist** — view movies and shows together, sorted by date added (newest first). The default view now shows the full watchlist at a glance; Movies and Shows filters remain available.

### Changed

- History and Watchlist use a unified grid implementation when browsing combined results, with per-type actions preserved (e.g. View Details for movies, Browse Seasons for shows).

### Breaking Changes

- None. Existing commands (Search Movies, Search Shows, etc.) are unchanged and remain available.

## [Update] - 2026-03-25

- Fixed episode check-in sending the show's Trakt ID instead of the episode's Trakt ID (#23638)
- Added Windows platform support (#25419)
- Upgraded @raycast/api to v1.104.10 and migrated to React 19 types
- Upgraded ESLint to v10 with flat config and resolved all npm audit vulnerabilities

## [Fix] - 2026-03-01

- Added User-Agent header to OAuth token and refresh requests to prevent authentication failures

## [Fix] - 2026-02-23

- Added User-Agent header to API client to fix 403 errors caused by Trakt's Cloudflare WAF blocking requests without one

## [Update] - 2025-08-18

- New unified detail view across movies, shows, episodes, watchlist, history, up next & recommendations
- Detail pages now show richer information (clearer summaries, images and key stats)
- Quick "View Details" action added almost everywhere for faster navigation
- More resilient when items have missing data (fewer blank spots)
- General polish and consistency improvements throughout

## [Update] - 2025-02-08

- Added new Recommendation command
- Added new Search Episodes command
- Completely rewrote the API client from ground-up to be end-to-end type-safe.

## [Update] - 2024-06-23

- Fixed rendering performance issues
- Added support for checking in movies directly from the Watchlist command

## [Initial Version] - 2024-06-12
