# Repository Guidelines

## Project Structure & Module Organization
- `package.json` is both the npm manifest and Raycast extension manifest. Add new commands there and keep command names aligned with `src/<command-name>.tsx`.
- `src/*.tsx` contains Raycast command entrypoints such as `search-tabs.tsx`, `search-web.tsx`, `search-history.tsx`, and `open-new-tab.tsx`.
- `src/utils/` holds shared browser, AppleScript, search, bookmark, history, URL, suggestion, and action helpers. Put reusable logic here.
- `tests/utils/` holds Vitest coverage for shared helpers. Keep test files out of `src/` so Raycast command source stays focused.
- `src/types.ts` defines shared extension models. `assets/` stores the extension icon; `metadata/` stores Raycast Store screenshots.

## Build, Test, and Development Commands
- `npm install` installs dependencies from `package-lock.json`.
- `npm run dev` runs `ray develop` for local Raycast testing.
- `npm run build` runs `ray build` and catches TypeScript or bundling errors.
- `npm run lint` runs `ray lint` with the Raycast ESLint config.
- `npm run fix-lint` runs `ray lint --fix` for safe automatic fixes.
- `npm test` runs Vitest unit tests for pure helpers.
- `npm run benchmark:tabs` runs a read-only AppleScript tab enumeration benchmark against the live Helium app.
- `npm run publish` publishes through the Raycast API; use only when release-ready.

## Coding Style & Naming Conventions
- Use TypeScript, React JSX, strict types, 2-space indentation, semicolons, and double quotes.
- Use PascalCase for React components and action components, camelCase for functions and variables, and kebab-case for Raycast command filenames.
- Treat Helium AppleScript tab IDs as the source of truth for tab identity. Keep favicon and Browser Extension data display-only.
- Use `useCachedBrowserTabs` for tab-list UIs so cached snapshots render immediately while fresh Helium reads update in the background.
- Release pending-close tombstones only from confirmed fresh Helium tab reads, not from cached or optimistic snapshots.
- Keep Helium profile access read-only. Use immutable/copy-safe reads for Chromium profile databases, and do not write `Web Data`, `Preferences`, or bang settings from the extension.
- Treat browsing history as optional and keep it isolated to `search-history`. `search-web` must stay focused on bangs and provider-backed web results.
- Mirror Helium search and bang behavior from Helium profile/settings where determinable; fall back loudly and conservatively rather than guessing.

## Testing Guidelines
- Add focused Vitest coverage for shared pure helpers and validate changes with `npm test`, `npm run lint`, `npm run build`, and `npm run dev`.
- Manually exercise affected commands in Raycast, especially tab switching, tab closing, bookmark search, URL/search suggestion behavior, and toast failures.
- Fail loudly: surface AppleScript, Browser Extension, and preference errors with actionable Raycast toasts instead of silently ignoring them.

## Commit & Pull Request Guidelines
- Recent history uses short imperative or scoped messages, often `Update <extension> extension (#12345)` or `Docs: ...`.
- PRs should include a summary, commands run, manual Raycast checks, linked issues, and screenshots or recordings for visible UI changes.
- When contributing to the Raycast Store, update `CHANGELOG.md` and add yourself to `contributors` in `package.json` when appropriate.

## Raycast Documentation
- Use the official [Raycast developer docs](https://developers.raycast.com/) for API, manifest, lifecycle, security, and Store publishing details.

## Agent-Specific Instructions
- Keep `AGENTS.md` current when conventions change. If a behavioral assumption is unclear, ask the maintainer before editing. Commit and push small, coherent changes regularly when working across multiple steps.
