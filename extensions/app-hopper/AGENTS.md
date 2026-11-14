# Repository Guidelines

## Project Structure

App Hopper is a macOS Raycast extension for finding and switching between running apps, windows, and browser tabs. `package.json` defines the Raycast command and npm scripts.

- `src/app-hopper.tsx` is the command entry point. `src/app-windows.tsx` and `src/browser-windows.tsx` contain the drill-down views.
- `src/window-data.ts` loads window snapshots, `src/window-focus.ts` handles activation and focus, and `src/browsers/` holds the browser registry and adapters.
- `assets/` contains the extension icon and Swift helpers for macOS window discovery and browser Accessibility integration. `tests/` contains the Node regression suite.

## Build and Development

Run these commands from the repository root:

- `npm ci` installs dependencies from the lockfile.
- `npm run dev` loads the extension in Raycast for local development on macOS.
- `npm run build` builds the Raycast extension.
- `npm run lint` checks the project with Raycast’s ESLint configuration. `npm run fix-lint` applies available fixes.
- `npm test` runs the regression suite.
- `npm run typecheck` checks the extension, tooling/tests, and Firefox companion with strict TypeScript.

## Coding Style

Use strict TypeScript and follow the existing two-space indentation, double quotes, and semicolons. Prettier uses a 120-character print width. Use kebab-case file names, PascalCase for React components and types, and camelCase for functions and hooks such as `useWindowSearch`. Keep browser-specific behavior in its adapter and update the matching Swift helper and TypeScript adapter together when their command arguments or output change.

## Testing

Name regression tests `*.test.ts` under `tests/`. Use `node:test` and `node:assert/strict` with descriptive names that state the expected behavior. Use `tests/load-ts.ts` to stub Raycast and native dependencies. For native changes, also test the affected window or tab workflow in Raycast on macOS with Accessibility permission enabled.

Scripts and tests run through `node --import tsx`. The shared Firefox/Zen companion source is `companion/background.ts` with canonical manifest `companion/manifest.json`. `npm run build:companion` generates `dist/companion/extension/`; `npm run package:companion` creates the single unsigned signing ZIP. Browser-specific build/package commands are aliases.

## Commits and Pull Requests

Use short, imperative commit subjects such as `Fix Firefox tab focus`. In pull requests, describe the user-visible change, link the issue when applicable, and list the automated checks and manual Raycast scenarios you ran. Include a screenshot or recording for visible UI changes.

Privileged Zen bridge and probe sources are TypeScript. Run `npm run build:privileged` before using generated Console scripts from `dist/privileged/`; never paste typed source directly into Zen.
