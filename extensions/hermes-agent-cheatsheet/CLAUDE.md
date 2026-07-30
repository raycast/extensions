> `CLAUDE.md` is a symlink to this file; edit `AGENTS.md` directly and do not replace the symlink.

# Repository Guidelines

## Project Structure & Module Organization

This repository contains a TypeScript/React Raycast extension. `src/index.tsx` is the command entry point. UI code lives in `src/components/`, reusable behavior in `src/lib/`, stateful React logic in `src/hooks/`, and shared contracts in `src/types.ts`. Catalog definitions are under `src/data/`; `generated.json` is produced by `scripts/sync-hermes-docs.mjs`. Tests live in `tests/`, while extension artwork and Raycast Store screenshots belong in `assets/` and `metadata/`.

## Architecture

The extension is a single Raycast `view` command (`src/index.tsx` → `CheatsheetList`) backed by a build-time-generated catalog. Two concerns dominate: how that catalog is produced, and how each list row derives everything it shows from a single selection decision.

### Catalog data pipeline

`src/data/generated.json` is the entire dataset — do not hand-edit it. `scripts/sync-hermes-docs.mjs` regenerates it by merging three sources:

- `manualItems`: a large hand-curated array in the script (getting-started, keyboard, models, configuration, gateway, automation, tools, skills-memory, mcp, environment, and troubleshooting entries).
- `parseTopLevelCommands()`: parses the upstream `cli-commands.md` reference table; `categoryForCliCommand()` maps each command family to a category.
- `parseSlashCommands()`: parses the upstream interactive and messaging tables in `slash-commands.md`, records shared platform availability, and injects `curatedSlashExamples()` recipes for option-heavy commands (`/model`, `/new`, `/fast`, `/compress`). `/fast --global` is also reconciled with the authoritative Hermes command registry while the prose reference catches up.

Every item is built through `createItem()`, which assigns a category-independent stable `id` (`command-${slugify(idKey)}`) and _infers_ consequence badges (`CAUTION` / `PERSISTS` / `RESTART` / `SESSION` / `DEPRECATED`) from focused regex heuristics over the usage and description text. Parsed slash commands use their command token (for example, `/reasoning`) as `idKey`, so documentation changes to optional arguments do not orphan favorites or recents. Items are deduped by both `id` and `usage` and sorted by category then name; because `manualItems` are merged first, curated entries win when an upstream table describes the same usage.

The parser fails fast when required upstream headings disappear instead of silently generating an incomplete catalog. Passing `--source /path/to/hermes-agent` reads upstream markdown from a local checkout, but rejects local changes to either source document so the recorded commit stays exact. Without `--source`, the script resolves a 40-character GitHub SHA and fetches both documents pinned to it. `src/data/index.ts` is the only module that imports `generated.json`, joining items to category metadata in `src/data/categories.ts` (`CATEGORY_ORDER` controls both list-section and dropdown order). To add or change a command, edit the sync script (or upstream docs) and regenerate; update the catalog-integrity assertions in `tests/data.test.mts` if the shape changes.

### Runtime rendering

Search is custom, not Raycast's built-in filter — `CheatsheetList` sets `filtering={false}` and drives it via `src/lib/filter.ts#filterItems`, which does diacritic-normalized substring plus multi-token AND matching; a leading `/` in the query restricts matching to command-shaped fields only. With no search and category `all`, the list renders Favorites and Recently Used sections (from `src/hooks/useCatalogHistory.ts`) and excludes those items from the category groups to avoid duplication. `useCatalogHistory` persists both lists to Raycast `LocalStorage`, guarded by a retryable hydration promise and serialized writes; failed writes roll back optimistic state and surface a failure toast. Recents are capped at 8 and recorded via `onUse` on copy/paste/open.

Each row's display flows from one call to `getPrimarySelection()` (`src/lib/examples.ts`), which returns `{ content, example, kind }`. That same selection feeds the row subtitle, the badges (`getEffectiveStatuses`), the detail markdown (`createItemMarkdown`), and the action panel, keeping them consistent. Related-command lists are precomputed once in `CheatsheetList` and passed to row details and actions to avoid repeating quadratic catalog scans. Three behaviors are easy to miss:

- **Personalization:** `getExamples()` rewrites `/model …` example commands with the user's `preferredModel` / `preferredProvider` preferences, but only when _both_ are set.
- **Context-sensitive `/model` badges:** `src/lib/status.ts#getEffectiveStatuses` special-cases the interactive `/model` item by stable ID so the scope badge follows the selected variant (`--global` → PERSISTS, explicit `--session` → SESSION, `--once` → no scope badge, `--refresh` → no scope badge and no CAUTION). An unflagged model switch is deliberately not labeled SESSION because Hermes can persist it when `model.persist_switch_by_default` is enabled.
- **Context-sensitive `/fast` badges:** the interactive `/fast` item is also special-cased (`fast` / `normal` → SESSION, `--global` → PERSISTS, `status` or the generic usage → no scope badge). `tests/data.test.mts` and `tests/filter.test.mts` keep generated and effective statuses in agreement.

## Build, Test, and Development Commands

- `npm install` installs the locked dependencies from `package-lock.json`.
- `npm run dev` starts Raycast development mode for local interaction.
- `npm test` runs all `tests/*.test.mts` files with Node's built-in test runner.
- `npm run lint` checks the Raycast ESLint rules; `npm run fix-lint` applies safe fixes.
- `npm run build` creates a production build in `dist/`.
- `npm run validate` runs tests, linting, and the production build; use it before opening a PR.
- `npm run sync-data -- --source /path/to/hermes-agent` regenerates the catalog from a local Hermes checkout. Without `--source`, it fetches upstream documentation.

## Coding Style & Naming Conventions

Follow strict TypeScript and the Raycast ESLint configuration. Prettier uses double quotes, trailing commas, and a 120-character line width; preserve the existing two-space indentation. Name React components and interfaces in `PascalCase`, hooks with a `use` prefix, and functions or variables in `camelCase`. Keep reusable logic outside components and use `import type` for type-only imports. Do not hand-edit `src/data/generated.json`; update the sync script or source docs and regenerate it.

## Testing Guidelines

Use `node:test` with `node:assert/strict`. Name new suites `*.test.mts` and write behavior-focused test descriptions, such as `test("filters by category", ...)`. Add focused unit coverage for logic changes and catalog integrity assertions for generated-data changes. There is no numeric coverage threshold, but every bug fix should include a regression test.

Do not use Computer Use to test this extension; rely on code inspection, automated tests, linting, and builds.

## Commit & Pull Request Guidelines

Recent history uses short, lowercase, imperative summaries such as `improve Hermes Agent cheatsheet UX`; keep commits focused and descriptive. Pull requests should explain the user-visible effect, list validation performed, and link relevant issues. Include screenshots or a short recording for Raycast UI changes. Call out regenerated catalog data and its upstream source commit when applicable.
