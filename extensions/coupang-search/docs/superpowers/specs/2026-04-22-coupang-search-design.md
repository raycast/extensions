# Coupang Search Raycast Extension Design

## Goal

Build a simple Raycast command that accepts a search query and opens the Coupang search results page in the browser.

## Constraints

- Direct HTTP fetches to Coupang search pages return `403 Access Denied` from this environment.
- Browser automation and scraping also created poor UX because Safari had to open visibly.
- Coupang seller Open API is not the right fit for consumer-wide search results.
- Scope stays intentionally small: one search command, no auth, no cart, no account features, no caching.

## Chosen Approach

Use a Raycast `no-view` command with one required text argument.

- The user enters a query in Raycast root search.
- The command builds the Coupang search URL.
- The default browser opens the search results page immediately.

This was chosen over:

- Plain HTML fetch plus parser: blocked by Coupang anti-bot protection.
- Browser automation plus scraping: works poorly for UX because a browser window has to appear.
- Seller Open API: limited to seller-owned products and not consumer-wide search.

## User Experience

- Command name: `Search Coupang`
- Input: one free-text search query argument
- Result: open Coupang search results in the default browser
- No intermediate Raycast list view

## Error Handling

- Empty query: show a simple HUD asking for a search term.
- Browser open failure: surface the Raycast error.

## Verification

- Install dependencies
- Build the extension with `npm run build`
- Confirm the command accepts a query argument in Raycast
- Confirm the browser opens the expected Coupang search URL
