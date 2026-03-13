# AGENTS.md

Guidance for coding agents working in this repository.

## Project Overview

- This is a Raycast extension named `raycast-github-gist-explorer`.
- It searches, previews, creates, and refreshes GitHub gists.
- Runtime code lives in `src/`.
- Tests live in `tests/`.
- The project uses TypeScript with `strict` mode enabled.
- Build and lint are handled through the Raycast CLI.
- Tests run with Node's built-in test runner through `tsx`.

## Source Of Truth

- `package.json` defines the primary scripts and Raycast command manifest.
- `tsconfig.json` defines compiler strictness and module settings.
- `README.md` describes the feature set and high-level project structure.
- There is currently no repository-local `.cursorrules` file.
- There is currently no `.cursor/rules/` directory.
- There is currently no `.github/copilot-instructions.md` file.

If any of those files are later added, treat them as additional instructions and merge them with this document.

## Setup

- Install dependencies with `npm install`.
- Use Node/npm compatible with the checked-in lockfile.
- Do not remove `package-lock.json` unless the task explicitly requires package manager migration.
- Raycast development assumes the Raycast CLI is available through project dependencies and npm scripts.

## Repository Layout

- `src/search-gists.tsx`: main search command UI, preview, and paste actions.
- `src/create-gist.tsx`: form-based gist creation command.
- `src/refresh-gists.tsx`: background refresh/rebuild command.
- `src/lib/github.ts`: GitHub API client and gist normalization.
- `src/lib/sync.ts`: sync pipeline and index rebuild flow.
- `src/lib/search.ts`: MiniSearch indexing, ranking, and recent sorting.
- `src/lib/storage.ts`: Raycast local cache persistence.
- `src/lib/preferences.ts`: Raycast preference access and token validation.
- `src/lib/errors.ts`: custom domain error classes.
- `src/lib/types.ts`: shared TypeScript data models.
- `tests/search.test.ts`: search relevance tests.

## Build, Lint, And Test Commands

Primary commands:

- `npm run build` - builds the Raycast extension.
- `npm run dev` - starts Raycast development mode.
- `npm run lint` - runs Raycast lint/validation.
- `npm test` - runs the full test suite.

Direct equivalents:

- `ray build`
- `ray develop`
- `ray lint`
- `npx tsx --test tests/*.test.ts`

### Running A Single Test File

- `npx tsx --test tests/search.test.ts`

### Running A Single Named Test

- `npx tsx --test --test-name-pattern="filename matches outrank content matches" tests/search.test.ts`

Notes:

- The named-test pattern above was verified in this repo.
- `npm test` currently expands `tests/*.test.ts`, so it covers all top-level test files matching that pattern.
- If more nested tests are added later, update the test script or run `npx tsx --test` directly.

## Current Command Status

These commands were checked while preparing this file:

- `npm run build` passes.
- `npm test` passes.
- `npm run lint` currently fails because `assets/icon.png` is `1024x1024`, while Raycast lint requires `512x512`.
- Raycast lint also warns that ESLint and Prettier are not installed, so formatting checks are currently skipped by the toolchain.

When making unrelated code changes, do not assume a lint failure means your code is wrong; check whether the failure is still the known icon-size issue.

## TypeScript And Runtime Conventions

- Keep TypeScript `strict`-safe; `tsconfig.json` has `"strict": true`.
- Prefer explicit domain types from `src/lib/types.ts` over ad hoc object shapes.
- Use type aliases (`type`) consistently, matching the existing codebase.
- Export shared domain types from `src/lib/types.ts` instead of redefining them locally.
- Keep public function return types explicit when they clarify behavior, especially for async functions and exported helpers.
- Use `async`/`await` instead of raw promise chains.
- Prefer small pure helpers for formatting, transformation, ranking, and normalization logic.

## Imports

- Put external imports first, then local imports.
- Use relative local imports like `./lib/search` and `./types`; there is no path alias setup.
- Group multi-line imports when they improve readability.
- The codebase does not separate type-only imports yet; follow existing style unless a change clearly benefits readability.
- Avoid unused imports; Raycast/TypeScript builds should stay clean.

## Formatting

- Follow the existing TypeScript style used throughout `src/` and `tests/`.
- Use 2-space indentation.
- Use semicolons.
- Use double quotes, not single quotes.
- Keep trailing commas in multi-line objects, arrays, params, and imports.
- Prefer one logical expression per line when chaining or formatting long argument lists.
- Favor concise helper functions over deeply nested inline logic in JSX.

## Naming Conventions

- Use `camelCase` for variables, functions, and local helpers.
- Use `PascalCase` for React components and error classes.
- Use descriptive boolean names such as `isLoading`, `isRefreshing`, `isMounted`, `isPublic`.
- Use descriptive verb phrases for async operations: `syncAllGists`, `loadCache`, `fetchRawFileContent`, `appendCreatedGistToCache`.
- Name formatter helpers with `format...` and constructor/build helpers with `build...` or `create...`.
- Prefer domain language from the app: `gist`, `file`, `cache`, `document`, `metadata`, `token`, `sync`.

## React And Raycast UI Style

- Keep command entrypoints as default exports in command files.
- Use functional React components.
- Manage UI state with React hooks (`useState`, `useEffect`, `useMemo`).
- Derive computed collections with `useMemo` when the result depends on cached state and search input.
- Keep Raycast action panels close to the component rendering them.
- Prefer small helper functions for repeated presentation logic like title/subtitle/preview builders.
- Return early for empty/error/loading states rather than nesting large conditional blocks.

## Error Handling

- Throw domain-specific `Error` subclasses for reusable failure modes.
- Existing reusable errors live in `src/lib/errors.ts`; extend that file instead of scattering string-only errors.
- When catching unknown values, narrow with `error instanceof Error` before reading `.message`.
- Provide user-facing fallback messages such as `"Unknown error"` or a task-specific message.
- In UI commands, surface failures with `showToast` or other Raycast feedback primitives.
- In cache parsing and opportunistic background fetches, fail softly when possible.
- Example existing pattern: corrupted cache JSON is removed and treated as a cache miss instead of crashing.
- Example existing pattern: truncated raw file fetch failures are counted and tolerated during sync.

## Data And Domain Modeling

- Normalize GitHub API responses before they reach UI code.
- Keep GitHub wire-format types separate from normalized app types.
- Existing pattern: `GitHubGistResponse` maps to `GistRecord` through `normalizeGist`.
- Preserve important distinctions such as `public` vs `secret`, raw URL presence, truncated content, and sync metadata.
- Keep search documents derived from normalized gist records, not vice versa.

## Testing Guidance

- Add tests in `tests/*.test.ts`.
- Use Node's built-in `node:test` module and `node:assert/strict`.
- Mirror the current style in `tests/search.test.ts`.
- Keep fixtures inline and minimal unless reuse becomes substantial.
- Test behavior and ranking outcomes rather than implementation details.
- For search changes, verify both positive matches and ordering behavior.
- For data normalization changes, add focused tests around default values and fallback behavior.

## Working With Search Logic

- Search behavior currently prioritizes filenames over descriptions over content.
- Recent gist ordering falls back to `updatedAt` string comparison.
- Empty search returns recent gists rather than MiniSearch results.
- If you change scoring, test ranking explicitly.
- If you change indexed fields, update both document construction and tests.

## Working With GitHub API Logic

- Reuse `requestJson<T>()` for authenticated GitHub API requests.
- Preserve the current headers pattern, including `Accept` and `User-Agent`.
- Treat `401` and `403` carefully: the code distinguishes rate-limit exhaustion from auth failures.
- Keep raw content fetching separate from authenticated API JSON requests unless there is a clear need to merge them.
- Do not leak tokens into logs, errors, or UI output.

## Working With Cache And Sync Logic

- Cache payloads should include `gists`, `documents`, and `metadata` together.
- When updating cache contents, keep metadata coherent, especially `gistCount` and index version semantics.
- `syncAllGists()` is the main full-refresh path; prefer extending it over creating parallel sync flows.
- Preserve graceful behavior when optional full-content hydration fails for some files.
- Be careful with versioned cache keys and index versions; changes here affect existing users' local data.

## Change Strategy For Agents

- Make the smallest change that fits existing patterns.
- Prefer improving shared helpers in `src/lib/` when multiple commands benefit.
- Avoid introducing new dependencies unless clearly justified.
- Avoid broad refactors unless the task requires them.
- Keep user-facing copy concise and consistent with existing toast/HUD phrasing.
- If a task touches ranking, sync, or persistence, run the relevant tests afterward.
- If a task touches Raycast manifest behavior, run `npm run build` and, when possible, `npm run lint`.

## When Updating This File

- Keep it repository-specific.
- Prefer facts verified from the codebase over generic best practices.
- Add Cursor or Copilot rule summaries here if `.cursorrules`, `.cursor/rules/`, or `.github/copilot-instructions.md` appear later.
- Update command examples if scripts or tooling change.
- Update the known lint issue section once the icon-size problem is fixed.
