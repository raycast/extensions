# PSO Fuel Prices (Raycast Extension)

Shows today's PSO (Pakistan State Oil) fuel prices — Premier Euro 5, Hi-Cetane
Diesel Euro 5, LDO, SKO, JP-1, Octane+ Euro 5 (by city), and LPG — right inside
Raycast.

Data is scraped live from https://psopk.com/en/fuels/fuel-prices on every
run (Raycast's `usePromise` handles loading/error states and caching).

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Run in development mode (opens in Raycast):
   ```
   npm run dev
   ```
   This registers the extension locally in Raycast. Open Raycast and search
   for **"Fuel Prices"**.

## Project structure

```
pso-fuel-prices/
├── package.json          # Extension manifest + Raycast command config
├── tsconfig.json
├── assets/
│   └── extension-icon.png
└── src/
    ├── fetch-prices.ts   # Fetches + parses the PSO page (cheerio)
    └── fuel-prices.tsx   # The List command UI
```

## How it works

- `fetch-prices.ts` downloads the PSO fuel-prices HTML page and uses
  `cheerio` (a jQuery-like HTML parser for Node) to walk every `<table>`
  on the page, pulling out `Product Name` / `Rs./Litre` pairs plus the
  nearby "Effective From: ..." date.
- `fuel-prices.tsx` renders each parsed section as a `List.Section`, with
  each product as a `List.Item`. Actions let you copy the price, copy
  "product: price", open the source page, or manually refresh (⌘R).

## Notes / things that may need tweaking

- **Site structure changes**: if PSO redesigns their page, the table
  parsing in `fetch-prices.ts` may need updates. It's intentionally
  generic (grabs *any* 2-column table) so it should be fairly resilient,
  but the `guessSectionTitle()` heuristic (labeling sections as "POL",
  "Octane+", "LPG") is based on keyword matching and may misfire if
  product names change.
- **Rate limiting / blocking**: if PSO starts blocking scraping, you may
  need to add caching (e.g. `@raycast/utils`'s `useCachedPromise` instead
  of `usePromise`) so you're not hitting their server on every keystroke.
- **Publishing to the Raycast Store**: replace the `author` field in
  `package.json` with your actual Raycast username, and swap in a proper
  icon (512x512 PNG) before running `npm run publish`. The current icon
  is just a placeholder.

## Useful commands

| Command      | Purpose                                   |
| ------------ | ------------------------------------------ |
| `npm run dev`    | Start local development (hot reload)   |
| `npm run build`  | Build for distribution                 |
| `npm run lint`   | Lint against Raycast's extension rules |

## Optimizations in this version

- **Instant loads via caching**: switched from `usePromise` to
  `useCachedPromise` (`@raycast/utils`). The list now shows the last known
  prices immediately when you open it, then quietly refreshes in the
  background — no blank/spinner screen on every launch.
- **Fetch timeout**: requests to psopk.com abort after 8s instead of
  hanging indefinitely if the site is slow or unreachable, surfacing a
  clear error instead.
- **Pre-parsed numeric values**: each price now also carries a `value:
  number` alongside the display string, computed once during parsing
  rather than re-parsed anywhere prices are used (sorting, filtering, etc.
  in future features).
- **Tighter row filtering**: rows are only kept if the second column
  actually looks like a number, filtering out stray tables (e.g. PDF
  document listings) more reliably.
- **Per-fuel icons**: petrol/diesel/LPG/jet-fuel rows get distinct tinted
  icons so the list is scannable at a glance.
- **Lint/format configs added** (`.eslintrc.json`, `.prettierrc`) so
  `npm run lint` and `ray build` run clean — these were missing before.
