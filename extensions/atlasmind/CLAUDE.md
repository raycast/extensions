# AtlasMind — Raycast Extension

A local quick-capture tool for URLs, text, and notes. Inspired by mymind.com but stored entirely on-device via Raycast's `LocalStorage`. Three commands: save form, save current browser tab, and a grid browser.

## Project location

`~/raycast-mymind/`

## Stack

- Raycast API (`@raycast/api`, `@raycast/utils`)
- TypeScript + React (Raycast's view model)
- No backend, no DB — items live in `LocalStorage` keyed by `item_<uuid>`

## Commands (`package.json`)

| Name | File | Mode | What it does |
|---|---|---|---|
| `save-item` | `src/save-item.tsx` | view | Form to save URL/text/note. Pre-fills from clipboard. On URL save, fetches OG metadata. |
| `save-current-tab` | `src/save-current-tab.tsx` | no-view | Captures the frontmost browser tab's URL. |
| `browse` | `src/browse.tsx` | view | 5-col Grid (3:2 aspect). Shows OG image as tile, falls back to a colored solid tile. |

## Data model (`src/types.ts`)

`Item { id, type: 'url'|'text'|'note', content, title, tags, created_at, og_image?, og_title? }`

## OG image flow (`src/fetch-og.ts`)

1. `save-item` writes the row immediately, then async fetches the URL with a Safari UA.
2. Regex-scans HTML for `og:image` / `twitter:image` / `<link rel="image_src">`, plus `og:title` / `<title>`.
3. `updateItem` patches the row with `og_image` + `og_title` if found.
4. 5-second timeout via `AbortSignal.timeout`.

## The "pink squares" behavior

`src/browse.tsx:16-34` — when an item has no `og_image`, `tileContent()` returns a solid `Color` from this palette:
`Blue, Purple, Magenta, Red, Orange, Yellow, Green` — picked deterministically by hashing `item.id`.

So **pink/magenta/red squares = items where OG image fetch returned nothing** (or the item was a text/note with no URL). Possible causes when *all* tiles are pink-ish:
- Site blocks the fetch (paywall, Cloudflare, requires JS-rendered HTML).
- `og:image` URL is relative and `resolveUrl` produced something invalid.
- Fetch timed out (5s).
- Image URL loads in a browser but Raycast's image renderer rejects it (CORS-ish or content-type).

To debug: open an item's record in LocalStorage and check `og_image`. If null → fetch failed. If populated → renderer issue.

## Scripts

```bash
cd ~/raycast-mymind
npm run dev          # ray develop — hot reload into Raycast
npm run build        # ray build → dist/
npm run lint         # ray lint
npm run fix-lint     # ray lint --fix
```

## Conventions

- Storage key prefix: `item_` — don't change without a migration.
- All async DB ops go through `src/db.ts` (`saveItem`, `getItems`, `updateItem`, `deleteItem`).
- Grid tile content is computed by `tileContent()` — single source of truth for image-vs-fallback.
