# AtlasMind

A local quick-capture tool for URLs, text, and notes — inspired by mymind.com, but everything stays on-device via Raycast's `LocalStorage`.

## Features

- **Save anything** — URLs, text snippets, notes. Pre-fills from clipboard.
- **One-shot tab capture** — saves the frontmost browser tab via AppleScript (Safari, Chrome, Arc, Brave).
- **Visual grid browser** — pages render as tiles using their preview image. Cascade: `og:image` → `twitter:image` → first substantial `<img>` → `apple-touch-icon` → optional Microlink screenshot fallback → high-res favicon.
- **Smart fuzzy search** — typo-tolerant, weighted ranking (title > tags > host > description > body), with a recency boost. Matches across page titles, descriptions, and a captured 500-char body excerpt.
- **Re-fetch previews** — `⌘R` per item, `⌘⇧R` to backfill all.

## Commands

| Command | Mode | What it does |
|---|---|---|
| Save to AtlasMind | view | Form to save URL / text / note. Auto-pulls clipboard. |
| Save Current Browser Tab | no-view | Captures the frontmost browser tab — bind a hotkey. |
| Browse AtlasMind | view | Grid view with fuzzy search. |

## Preferences

- **Screenshot fallback** — enables Microlink to screenshot SPAs / pages that block scraping.
- **Microlink API key** — optional, raises the rate limit for the screenshot fallback.

## Stack

- Raycast API (`@raycast/api`, `@raycast/utils`)
- TypeScript + React
- `fuse.js` for ranking
- No backend — `LocalStorage` keyed by `item_<uuid>`

## Develop

```bash
npm install
npm run dev      # ray develop, hot reload into Raycast
npm run build    # ray build → dist/
npm run lint
```

## License

MIT
