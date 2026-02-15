# Development Guide

## Prerequisites

- macOS with Raycast installed.
- Node.js 20+.
- npm.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start Raycast extension development mode:
   ```bash
   npm run dev
   ```
3. Open Raycast and run one of this extension's commands.

## Build and Test

- Build extension bundle:
  ```bash
  npm run build
  ```
- Run tests:
  ```bash
  npm test
  ```
- Lint:
  ```bash
  npm run lint
  ```

## How Raycast Loads This Extension

- Manifest and command definitions live in `package.json`.
- Each command name in `package.json` maps to a source file under `src/`.
- `ray develop` compiles and hot-reloads commands into your Raycast development environment.
- `ray build -e dist` validates and compiles production artifacts.

## Adding a New Command

1. Add a command entry to `package.json` `commands`.
2. Create corresponding file in `src/` using the same command name.
3. If command needs configuration, add preferences in `package.json` and parse them in `src/lib/preferences.ts`.
4. Run:
   ```bash
   npm run build
   npm test
   ```

## Coding Conventions

- TypeScript strict mode is enabled.
- Prefer pure helper functions in `src/lib` for behavior that can be tested.
- Keep Raycast UI components thin; push logic into `src/lib`.
- Guard all user-facing operations with clear failure toasts.

## Updating Preferences Safely

When adding a preference:

1. Add manifest preference in `package.json`.
2. Add raw field to `RawPreferences` in `src/lib/preferences.ts`.
3. Parse and normalize into `ResolvedPreferences`.
4. Update docs (`README.md` preference table).

## Release Checklist

1. `npm test` passes.
2. `npm run build` passes.
3. `npm run lint` passes in a network-enabled environment.
4. `package.json` `author` is set to your real Raycast username.
5. Commands work manually in Raycast.
6. Preferences behave as expected.
7. README and docs match current behavior.
