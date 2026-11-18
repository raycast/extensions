# AGENTS.md

This file provides guidance to code agents when working with code in this repository.

## Commands

```bash
npm run dev        # Start development mode (run in terminal manually — long-running)
npm run build      # Production build
npm run lint       # Run ESLint
npm run fix-lint   # Auto-fix lint issues
npm run publish    # Publish to the Raycast Store
```

## Architecture

This is a [Raycast](https://developers.raycast.com/) extension built with React + TypeScript. It is a frontend-only client — all data comes from the Lattice app's local HTTP API.

- `src/lattice-search.tsx` — `lattice-search` command: live search with paper detail view and clipboard actions.
- `src/lattice-status.tsx` — `lattice-status` command: health check showing API/app version and capabilities.
- `src/lattice-doi.tsx` — `lattice-doi` command: detect DOI from current browser page and fetch metadata via CrossRef/arXiv.
- `src/metadata.ts` — Metadata fetcher for DOI resolution (CrossRef + arXiv APIs).
- `src/export-formats.ts` — Citation format conversion utilities for structured exports and bundled CSL bibliography styles.
- `src/export-clipboard.ts` — Clipboard export helpers, including rich-text HTML output with configurable font family and size.
- `package.json` `"commands"` array declares all commands; adding a new command requires both a new entry there and a corresponding file in `src/`.
- Raycast API components (`List`, `Detail`, `Form`, `Action`, etc.) come from `@raycast/api`. Utilities like `useFetch`, `useLocalStorage` come from `@raycast/utils`.

## Preferences

- `port` — local Lattice API port, default `52731`.
- `preferredFormat` — quick-copy export format. Valid values include `bibtex`, `ris`, `csl-json`, and CSL style names from `assets/styles` without the `.csl` suffix.
- `clipboardFontFamily` — font family used for rich-text clipboard exports.
- `clipboardFontSize` — font size in points used for rich-text clipboard exports.

## Local API

Base URL: `http://127.0.0.1:<port>/api/v1` (default port `52731`, configurable via Raycast preferences)

The Lattice app must be running for any API call to succeed. Check `/status` first if debugging connectivity.

- Protocol is HTTP.
- Response content type is JSON.
- Supported methods are `GET` and `OPTIONS` only.
- Write operations are not supported by the Local API.
- Error responses use a uniform shape: `{ error: string }`.
- Common statuses: `200`, `204` (`OPTIONS`), `400`, `403`, `404`, `405`, `500`.
- The API is intended for local origins (`localhost` / `127.0.0.1`). Do not assume arbitrary remote origins will work.

### `GET /status`
Health check. Returns `{ ok, apiVersion, appVersion, capabilities }`.

- `capabilities` is a `string[]`.
- Known capabilities currently include `search`, `paper-detail`, `csl-item`, and `plugin-hosting`.

### `GET /search?q=<query>&limit=<n>`
Search the literature database. Returns lightweight result cards wrapped in a `papers` array:
```
{
  papers: [
    { id, title, authorsDisplay, subtitle, year, citekey, paperType }
  ]
}
```
- `q` is optional. If empty, the endpoint returns recently added papers.
- `limit` defaults to `10` and valid values are `1` to `50`.
- `id` — paper UUID, used to fetch full details
- `title` — empty titles are normalized by the API to `Untitled`
- `subtitle` — pre-formatted secondary line (authors, year, source) for UI display
- `year` — `integer | null`
- `paperType` values: `article`, `book`, `inproceedings`, `thesis`, `report`, `misc`

### `GET /papers/<uuid>`
Full citation record for a single document:
```
{ id, citekey, title, authors, year, journal, doi, volume, issue, pages, isbn, paperType, cslItem }
```
- `<uuid>` must be a valid UUID or the API returns `400`.
- Nullable fields include `year`, `journal`, `doi`, `volume`, `issue`, `pages`, and `isbn`.
- `cslItem` — embedded CSL-JSON payload, ready for citation processors
- `cslItem.id` matches the paper UUID.
- `cslItem.issued` is the canonical date object and should be preferred when deriving years for export logic.
- `paperType` maps to CSL types as follows:
  - `article` -> `article-journal`
  - `book` -> `book`
  - `inproceedings` -> `paper-conference`
  - `thesis` -> `thesis`
  - `report` -> `report`
  - `misc` -> `article`

### `OPTIONS`
The API accepts `OPTIONS` for browser preflight requests and returns `204 No Content` with CORS headers only.

## Export Behavior

- Structured export formats are generated locally from `cslItem`: `bibtex`, `ris`, `csl-json`.
- Bibliography-style exports are driven by CSL files under `assets/styles`.
- Rich-text clipboard output is HTML plus plain text fallback; Word formatting is controlled via `clipboardFontFamily` and `clipboardFontSize`.
- If you add a new export format, keep `README.md`, `README.zh-CN.md`, and preference descriptions in sync.

### Example curl calls
```bash
curl "http://127.0.0.1:52731/api/v1/status"
curl "http://127.0.0.1:52731/api/v1/search?q=graph%20neural%20network&limit=5"
curl "http://127.0.0.1:52731/api/v1/papers/550E8400-E29B-41D4-A716-446655440000"
```

## Code Style

- Prettier: `printWidth: 120`, double quotes.
- TypeScript strict mode enabled.
- JSX transform: `react-jsx` (no need to import React explicitly).
- Keep UI copy short and explicit. Handle API failures with clear empty/error states rather than silent fallbacks.
- When consuming the Local API, code to the documented response shapes above instead of inferred assumptions.

## Dependency and License Policy

- Keep the extension compatible with Raycast Store publishing requirements and the repository's MIT license.
- Do not introduce dependencies with copyleft, network-copyleft, attribution-copyleft, or commercial-use restrictions without explicit approval.
- Before adding or upgrading a dependency used in the shipped extension bundle, verify both direct and important transitive licenses.
- Treat licenses such as `AGPL`, `GPL`, `LGPL` (when bundling risk is unclear), `CPAL`, SSPL, and similar reciprocal licenses as blocked by default for this repository.
- Prefer permissive alternatives such as `MIT`, `BSD`, `ISC`, or `Apache-2.0`.
- If a feature would require a risky dependency, either implement a small local formatter/helper instead or pause and document the license tradeoff before merging.
