# Usage Guide

## What This Extension Does

FBL - Finnish Business Lookup lets you search Finnish businesses in Raycast using PRH YTJ open data.

## Start

1. Install dependencies:

```bash
bun install
```

2. Start extension development mode:

```bash
bun run dev
```

3. Open Raycast and run `Search Finnish Businesses`.

## Search Behavior

- Name search: type at least 3 characters (example: `nokia`)
- Business ID search:
  - full format: `0112038-9`
  - 8 digits: `01120389` (auto-normalized)
- Short numeric input (example: `123`) is intentionally blocked with guidance.
- Search uses a short cache for speed:
  - repeated queries within ~120 seconds return instantly from cache
  - stale cached results can appear first, then refresh in background
- Cache is also persisted locally so repeated queries remain fast across command reopen.
- If more results exist, use `Load More Results` to fetch the next page.

## Split View UX

- During active search, the command uses split view:
  - left: compact result list
  - right: minimal quick summary with dates first (last modified, registration/end date, status, essentials)
- Full details are still available via `View Details`.

## What's New (In App)

- When the command opens with no active query, a `What's New` section appears under `Get Started`.
- Select `Version History` and run `View What's New` to open recent release notes inside Raycast.

## Available Actions

- View Details
- Copy Business ID
- Copy Primary Address (if available)
- Open company website (if available)
- Open primary address in Google Maps or Apple Maps (if available)
- Open YTJ search page
- Open raw PRH JSON for the selected Business ID

## Current Limits

- No financial tabs
- No guaranteed direct per-company YTJ deep-link
- No phone/email fields in PRH YTJ v3 `/companies`

## Troubleshooting

- If results look stale or missing, retry with exact Business ID.
- If API/network errors occur, Raycast shows failure toasts.
- Validate extension health with:

```bash
bun run lint
bun run build
```
