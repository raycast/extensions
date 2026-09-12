# OneCal Unified Calendar Changelog

## [Account-aware meeting links] - 2026-09-04

- Open Google Meet links with the calendar's own Google account (via the `authuser` parameter), so meetings from a work calendar open with the work account even when the browser is signed in to multiple Google accounts. Copied URLs are left untouched

## [Initial Version] - 2026-09-01

- Unified calendar view: list events from all synced OneCal calendars, grouped by day
- Hide clone events created by OneCal Sync (server-side `isClone` flag, toggle with ⌘⇧H)
- "Up Next" section: all ongoing meetings plus meetings starting within 5 minutes
- Join meetings directly (Google Meet / Zoom / Teams / Webex / Whereby URLs)
- Instant display from cache with background refresh (stale-while-revalidate)
- OAuth 2.0 + PKCE authentication against the official OneCal MCP server
