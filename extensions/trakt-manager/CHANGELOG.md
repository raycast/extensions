# Trakt Manager Changelog

## [Update] - 2026-09-23

### Added

- **AI tools for personal lists** — Raycast AI can now read your Trakt lists, check whether a title is on one, create, rename or delete a list, and add or remove movies, shows, seasons and episodes. Building a themed list takes a single batched call, and every change asks for confirmation naming the list and the items as Trakt holds them.
- List names keep their emoji and non-Latin characters when matched, so "🎬 Oscars 2026" and "Oscars 2026" stay distinct lists.

## [Update] - 2026-09-19

### Added

- **AI tools that update your account** — Raycast AI can now add to and remove from the watchlist, mark movies, shows and episodes as watched, remove history entries, and rate or unrate a title. Every action asks for confirmation first, and the dialog names the item by looking its Trakt ID up on Trakt, so a wrong identifier surfaces there instead of silently modifying the wrong title.
- A tool to read your own ratings, including a targeted lookup for the score you gave a specific title.

## [Update] - 2026-09-17

### Added

- **AI tools for browsing your account** — Raycast AI can now read your Trakt account directly, reusing the existing OAuth session. Ask it in plain language to search a title, check whether you have already watched something, or see what to watch next.
- Nine read-only tools: search movies and shows, watchlist, watch history, up next, show progress, season episodes, personalised recommendations, and account statistics. None of them modify your account.

### Fixed

- Searching by year no longer misses titles. Trakt ranks search results by relevance and serves them as a single capped page, so a lesser-known release sharing a popular title stayed out of reach and could be reported as missing. Searches now combine Trakt's exact-title and relevance results, which surfaces releases such as Dune (1989) that ranking alone hides.
- Resolving a title now prefers an exact title match over the most popular one, so "Butterfly" no longer resolves to "Sniper Butterfly".
- When a requested year matches nothing, tools now say the title exists for other years instead of reporting it as unknown, and flag when a fallback was used rather than presenting it as an exact match.

## [Fix] - 2026-09-14

- Fixed sign-in failing with `invalid_grant` ("invalid code") when a command issued several requests at once. Each request triggered its own authorization, so the same single-use code was exchanged more than once; concurrent callers now share one in-flight authorization
- Moved authorization, token exchange and refresh to the `auth.trakt.tv` host, which Trakt now requires for all OAuth requests
- Fixed the `redirect_uri` sent when refreshing, which used a package name that never matched the static redirect URL Raycast uses during authorization
- Token errors now report Trakt's `error` and `error_description` instead of the raw response body

## [Fix] - 2026-07-03

- Fixed token refresh failing because the `redirect_uri` sent to Trakt's token endpoint didn't match the one used during authorization

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
