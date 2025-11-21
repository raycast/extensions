# Repository Guidelines

## Raycast Feature Requirements
- Refresh Clash Verge subscription from the configured URL with clear error toasts.
- List nodes with name/type/address and latest latency; allow copying an address.
- Run per-node speed tests with inline progress/result.
- Switch the active node; confirm via HUD/toast and mark the active item.
- Toggle proxy mode (Rule/Global/Direct) and display the current mode.
- Manage exclude URLs/domains (add/remove/disable) and sync changes with Clash Verge config.
- Provide quick actions to open Clash Verge app/settings when deeper adjustments are needed.

## Project Structure & Module Organization
- `src/*.tsx` contains Raycast commands; `src/switch-proxy.tsx` is the current entry listed in `package.json`.
- Add new commands as `.tsx` siblings and register them in `package.json`.
- `assets/extension-icon.png` stores the Raycast store icon; keep extra media here.
- Root configs (`tsconfig.json`, `eslint.config.js`, `package.json`) hold tooling settings.

## Build, Test, and Development Commands
- `npm install` — install dependencies (npm is preferred).
- `npm run dev` — `ray develop` preview for interactive testing.
- `npm run build` — `ray build` to verify packaging.
- `npm run lint` / `npm run fix-lint` — static analysis via the Raycast ESLint preset.
- `npm run publish` — publish to the Raycast Store; npm publishing is blocked by `prepublishOnly`.

## Coding Style & Naming Conventions
- TypeScript in `strict` mode; add explicit types on public surfaces and API shapes.
- Components in PascalCase; variables/functions in `camelCase`; command files in `kebab-case.tsx` matching `package.json`.
- Prettier defaults (2 spaces, double quotes). Run `npx prettier . --write`. ESLint extends `@raycast/eslint-config`.

## Testing Guidelines
- No automated tests yet—treat `npm run dev`, lint, and type-check as the current gate.
- For new logic (API requests, parsing, caching), add `*.test.ts` alongside the module and mock Clash Verge endpoints; avoid real secrets.

## Commit & Pull Request Guidelines
- Use concise, imperative commit messages (e.g., `Add node toggle action`, `Handle speed test errors`).
- PRs should summarize behavior changes, include Raycast screenshots/recordings for UI updates, and link issues when relevant.
- Note new config or environment needs in the PR description; keep diffs scoped to the change.

## Security & Configuration Tips
- Do not commit subscription URLs, tokens, or cookies; prefer environment variables typed via `raycast-env.d.ts`.
- Use HTTPS endpoints and handle request failures/timeouts gracefully. Remove debug logging before publishing.
- Guard UI actions against missing or stale Clash Verge state to avoid destructive writes.
