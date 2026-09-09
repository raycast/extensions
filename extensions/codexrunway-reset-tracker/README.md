# CodexRunway Reset Tracker

A Raycast extension that reads the public, unauthenticated CodexRunway API
(`https://www.codexrunway.com/openapi/v1`) and shows the latest usage-reset
schedule/completion status.

It ships three commands:

- **Reset Status (Menu Bar)** — lives in your macOS menu bar, shows a short
  status (e.g. "Reset today · 4h ago" / "No reset today") and
  auto-refreshes every 10 minutes. Click it for details and a manual
  refresh / "open source post" action.
- **View Latest Reset** — a full-detail view of the newest record (metadata
  panel + the original announcement text), with an action to copy the raw
  JSON.
- **Browse Reset History** — a paginated, filterable (all / scheduled /
  completed) list of past records.

## Notes on the API

- `GET /records?kind=all|reset_scheduled|reset_completed&page=1&pageSize=10`
  (`pageSize` max 10)
- No auth header needed; rate limit is 20 requests/hour with
  `X-RateLimit-*` response headers and a `429` + `Retry-After` when
  exceeded. The menu bar command therefore refreshes every 10 minutes, and
  each run makes a single request that serves both the latest record and
  the "did it reset today?" check.
