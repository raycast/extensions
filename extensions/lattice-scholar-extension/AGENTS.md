# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start development mode (run in terminal manually — long-running)
npm run build      # Production build
npm run lint       # Run ESLint
npm run fix-lint   # Auto-fix lint issues
```

## Architecture

This is a [Raycast](https://developers.raycast.com/) extension built with React + TypeScript. It is a frontend-only client — all data comes from the Lattice app's local HTTP API.

- `src/lattice-search.tsx` — the single command entry point, registered as `lattice-search` in `package.json`. Each Raycast command exports a default React component.
- `package.json` `"commands"` array declares all commands; adding a new command requires both a new entry there and a corresponding file in `src/`.
- Raycast API components (`List`, `Detail`, `Form`, `Action`, etc.) come from `@raycast/api`. Utilities like `useFetch`, `useLocalStorage` come from `@raycast/utils`.

## Local API

Base URL: `http://127.0.0.1:52731/api/v1`

The Lattice app must be running for any API call to succeed. Check `/status` first if debugging connectivity.

### `GET /status`
Health check. Returns `{ ok, apiVersion, appVersion, capabilities[] }`.

### `GET /search?q=<query>&limit=<n>`
Search the literature database. Returns lightweight result cards:
```
{ id, title, authorsDisplay, subtitle, year, citekey, paperType }
```
- `id` — paper UUID, used to fetch full details
- `subtitle` — pre-formatted secondary line (authors, year, source) for UI display

### `GET /papers/<uuid>`
Full citation record for a single document:
```
{ id, citekey, title, authors, year, journal, doi, volume, issue, pages, isbn, paperType, cslItem }
```
- `cslItem` — embedded CSL-JSON payload, ready for citation processors

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
