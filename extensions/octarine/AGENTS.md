# Project guidance

This repository contains a Raycast extension for Octarine. It uses TypeScript, React, and npm.

## Code

- Keep changes focused and code simple, readable, and easy to maintain.
- Use concise names when the context makes their meaning clear.
- Call `getPreferenceValues()` at the top level of a component or at module scope. Do not call it inside `useMemo` or another nested function.

## Source organization

- Use kebab-case for filenames under `src` and `tests`, except conventional `index.tsx` files. Use PascalCase for components and `useCamelCase` for hooks.
- Command entrypoint filenames must match their names in `package.json`.
- Keep a command in `src/<command>.tsx` while it fits in one file. If it needs multiple files, move its private code to `src/commands/<command>/` and re-export it from the entrypoint.
- Within a command, use `components` for Raycast UI and actions, `hooks` for state, effects, and orchestration, and `lib` for pure logic and source-specific queries.
- Move code to shared `src/components`, `src/hooks`, `src/lib`, or `src/types` only when it has a responsibility across commands.
- Command slices may depend on shared modules. Shared modules and other command slices must not depend on a command slice.
- Keep extension preference readers in `src/lib/preferences.ts`, including readers for command-specific preferences.
- Keep tests under `tests` and follow the source directory structure.
- Update `README.md` when commands, arguments, preferences, or keyboard shortcuts change.

## Dependencies and validation

- Use npm to manage dependencies. Update `package-lock.json` when dependencies change.
- `npm test` runs the Vitest suite.
- `npm run lint` checks the extension manifest, icons, metadata, ESLint rules, and formatting.
- `npm run build` builds the extension for distribution.
- `npm run dev` runs the extension in Raycast for manual checks.
- Before a Store submission, run `npm run build` and `npm run lint`. Check UI and shortcut changes in Raycast.
