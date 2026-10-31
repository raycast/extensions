# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Raycast extension that searches the [SchemaStore](https://www.schemastore.org) catalog (`https://www.schemastore.org/api/json/catalog.json`) for JSON schemas. Published under the `perishdev` owner in the Raycast Store.

## Commands

- `npm run dev` — `ray develop`: hot-reload the extension into the local Raycast app.
- `npm run build` — `ray build`: production build (run before publishing).
- `npm run lint` / `npm run fix-lint` — `ray lint` (uses `@raycast/eslint-config`).
- `npm run publish` — publishes to the Raycast Store (not npm). The `prepublishOnly` script intentionally blocks `npm publish` to prevent accidental npm releases.

There is no test runner configured.

## Architecture

Single-command extension. The command is declared in `package.json` under `commands[]`:

- `name: "search-schema-store"` maps to `src/search-schema-store.tsx` (Raycast resolves command → file by name).
- `mode: "view"` means the entry file `export default`s a React component rendering a Raycast `<List>` / `<Detail>` / `<Form>` UI.
- Switching to a quick one-shot action requires changing the mode to `"no-view"` and exporting an async function (no React).

The catalog is fetched via `useFetch` from `@raycast/utils`, which Raycast caches across launches — avoid hand-rolled fetch + `useState` for remote data in view mode.

Targets macOS and Windows (`platforms` in `package.json`) — avoid macOS-only assumptions.

## Conventions

- TypeScript strict mode via `tsconfig.json`; React 19 and Node 22 types are installed for compatibility with the Raycast runtime.
- Prettier + the Raycast ESLint config are the source of truth for style; run `npm run fix-lint` before committing.
- Commit messages follow Conventional Commits; branches follow Conventional Branch (per global user instructions).
