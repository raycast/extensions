# Repository Guidelines

## Project Structure & Modules
- `src/`: Raycast commands (TypeScript + React). Current entry: `salesforce---open-org-list.tsx`.
- `assets/`: static assets (icons). Main icon: `extension-icon.png`.
- Root config: `package.json`, `tsconfig.json`, `eslint.config.js`, `.prettierrc`.
- Docs: `README.md`, `CHANGELOG.md`.

## Build, Test, and Development
- `npm run dev`: Launches Raycast in develop mode (`ray develop`) to iterate locally.
- `npm run build`: Builds the extension with Raycast tooling (`ray build`).
- `npm run lint`: Lints with Raycast ESLint config. Use `npm run fix-lint` to auto‑fix.
- `npm run publish`: Publishes to the Raycast Store (requires Raycast account). Note: `prepublishOnly` intentionally blocks `npm publish` to npm.

## Coding Style & Naming
- Language: TypeScript (ES2023), React JSX (`jsx: react-jsx`), strict mode enabled.
- Formatting: Prettier (`.prettierrc`: width 120, double quotes).
- Linting: ESLint using `@raycast/eslint-config` (follow its rules; no unused vars/any, consistent imports).
- File naming: Command files mirror `package.json` command names (kebab-case with triple dashes as needed by Raycast). Assets are snake/kebab per existing patterns.

## Testing Guidelines
- No formal unit test framework is configured yet. Validate behavior via `npm run dev` in Raycast and exercise command flows.
- When adding tests, prefer `vitest` + React Testing Library; place tests alongside sources as `*.test.tsx`.

## Commit & Pull Requests
- Commits: Use Conventional Commits when possible: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`. Keep scope small and messages imperative.
- PRs: Include a clear description, linked issue (if any), before/after screenshots or screen recordings of the Raycast UI, and steps to verify via `npm run dev`.
- Changelog: Update `CHANGELOG.md` under a new version heading when user‑visible changes occur.

## Security & Configuration Tips
- Local prereqs: Raycast app, Node 18+, and Salesforce CLI (`sf`) if interacting with authorized orgs.
- Never commit tokens or org credentials. Access Salesforce via the local CLI session.
- Icons must be licensed for redistribution; keep images in `assets/`.
