# [AGENTS.md](http://AGENTS.md) — LinkIt Raycast Extension
## What this is
Single-command Raycast extension (`src/index.tsx`). Reads selected text, searches via Startpage → DuckDuckGo → Bing (fallback chain), and lets the user paste results as markdown links or cards.
## Key commands
```bash
npm run dev        # Live-reload in Raycast (requires Raycast installed)
npm run build      # ray build --skip-types -e dist -o dist  (CI uses this)
npm run lint       # ray lint (Raycast's ESLint wrapper)
npm run fix-lint   # ray lint --fix

```
No test suite exists. CI runs `lint` then `build` — that's the full verification gate.
## Architecture
| File | Purpose |
| --- | --- |
| `src/index.tsx` | Single Raycast command — UI, state, all actions |
| `src/duckduckgo.ts` | Search engine scraping: Startpage → DDG → Bing fallback |
| `src/types.ts` | `SearchResult` interface (`title`, `url`, `snippet`, `engine`) |
| `src/utils.ts` | Output formatters: markdown links, markdown cards, HTML cards |
| `raycast-env.d.ts` | Auto-generated from `package.json` — do not edit manually |

## Important quirks
- `raycast-env.d.ts`** is generated** — never edit directly; it's regenerated from `package.json` manifest.

- `build`** skips type-checking** (`--skip-types`). Run `tsc --noEmit` manually if you need type verification before CI.

- **No **`prettier`** config file** — Prettier is a dev dep but formatting is delegated to the Raycast ESLint config (`@raycast/eslint-config`).

- `prepublishOnly`** blocks **`npm publish` — use `npm run publish` (wraps `@raycast/api` publish) for the Raycast store.

- **Search engine order matters**: `searchDuckDuckGo()` tries Startpage first, DDG second, Bing third. DDG is just the export name, not necessarily the first engine tried.

- `formatResultsAsHtmlCards` returns `{ html, text }` (not a string) — `Clipboard.paste()` uses both fields for rich paste.

## TypeScript config
- `strict: true`, `module: "node16"`, `moduleResolution: "node16"` — use `.js` extensions in relative imports if adding new `.ts` files with explicit imports (node16 requirement).

- `jsx: "react-jsx"` — no need to import React in TSX files.

- Target: `es2022`, lib: `es2022` (Node 20 context).

## CI
`.github/workflows/ci.yml` runs on push/PR to `main`:
- `npm ci`

- `npm run lint`

- `npm run build`

No separate typecheck step in CI — type errors won't fail the pipeline unless you add `tsc --noEmit`.