# DuckDuckGo Image Search Changelog

## [Search Reliability and Pagination] - 2026-07-14

- Added a shared browser-like DuckDuckGo HTTP client with platform-appropriate headers, consistent timeouts, and connection reuse.
- Debounced search input and required at least two characters before starting a new search to reduce unnecessary requests while typing.
- Kept the last valid search session active when the search field is cleared, so its results and pagination remain available.
- Stopped caching one global VQD token across unrelated queries; each search now creates its own session and performs at most one bounded token refresh.
- Added cache-busting for VQD acquisition and prevented an already-rejected token from triggering duplicate image requests.
- Corrected DuckDuckGo image request parameters, including filter ordering, omission of empty filters, and the `ct` session parameter.
- Limited transient network retries to one internal attempt with jitter and removed the Retry Count and Sleep Time preferences that could amplify rate limits.
- Added specific handling and user-facing errors for rejected sessions, rate limits, anti-bot responses, timeouts, and unavailable search responses.
- Fixed cursor-based pagination and deduplicated images within and across pages using their image tokens.
- Reduced search logging to request status and result counts instead of logging complete DuckDuckGo responses.
- Added URL validation, a 15-second timeout, and a 25 MB size limit when downloading images.
- Handled image download, copy, paste, and save failures without closing Raycast or reporting expected errors as unhandled exceptions.
- Updated action shortcuts to Raycast's cross-platform common shortcuts and corrected Windows-specific shortcut definitions.
- Updated Raycast API, Raycast Utils, Axios, TypeScript, ESLint, Prettier, and related development tooling.

## [Windows Support] - 2025-10-13

- Added platform-specific shortcuts for macOS and Windows.
- Extended supported platforms to include Windows.
- Introduced a fallback for the download directory and added validation.
- Standardized naming to "DuckDuckGo" in metadata and documentation.

## [Save image] - 2025-10-09

- Added functionality to save images.
- Added a preference to set the save directory for images.

## [Potential fix of error] - 2025-08-19

- Originally the exception happened in the `src/search-image.tsx:96:37`:

## [Initial Version] - 2025-08-04

```
search-image | TypeError: Cannot read properties of undefined (reading 'length')
```
