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

## Language

The interface follows your macOS language by default: Finnish when Finnish is your primary device language, and English otherwise. The region setting alone does not determine the language.

To override this, open Raycast Settings → Extensions → FBL - Finnish Business Lookup and set **Language / Kieli** to **English**, **Suomi**, or **System Default / Laitteen kieli**. You can also open these settings from the start screen's action menu. Reopen the command after changing the language.

Search, company details, actions, hints, error titles, dates, and in-app release notes use the selected language. PRH descriptions and city names prefer the selected language, with English, Finnish, and Swedish as fallbacks when a translation is unavailable. Official company names are preserved as supplied by PRH. Cached results also follow the selected language.

Raycast's command name and its own interface remain controlled by Raycast.

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
  - right: minimal quick summary with the city shown separately from the address, followed by status and key dates
- Full details are still available via `View Details`.
- Company names use the full row width and show the complete name in a tooltip when hovered.
- Name-history previews show a few names as separate rows and direct larger histories to `View Details`.
- Press `Command-C` to copy the selected company's Y-tunnus directly from the preview.
- Press `Command-Shift-C` to copy the selected company's address in a multiline postal format.
- Press `Command-O` to open the selected company's website when one is available.
- Press `Command-E` to search the official e-invoice directory using the selected company's Y-tunnus.

## What's New (In App)

- When the command opens with no active query, a `What's New` section appears under `Get Started`.
- Select `Version History` and run `View What's New` to open recent release notes inside Raycast.

## Available Actions

- View Details
- Copy Y-tunnus
- Copy Primary Address (if available)
- Open company website (if available)
- Open the official e-invoice directory with the selected Y-tunnus
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
