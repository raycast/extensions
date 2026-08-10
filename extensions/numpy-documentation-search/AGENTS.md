# Repository Guidelines

This guide helps contributors ship updates to the NumPy Documentation Search Raycast extension.

## Project Structure & Module Organization

- `src/numpy-docs.tsx`: main Raycast command with search UI, caching, and detail rendering.
- `src/lib/`: shared utilities for Sphinx inventory loading, search ranking, and HTML parsing.
- `src/__tests__/`: Vitest specs plus HTML fixtures that mimic NumPy docs for parser coverage.
- `assets/extension-icon.png`: Raycast marketplace icon; keep additional assets here and reference them in `package.json`.
- Root configs (`package.json`, `tsconfig.json`, `eslint.config.js`, `.prettierrc`, `vitest.config.ts`) define build, lint, and testing behavior.

## Build, Test, and Development Commands

```bash
npm install
npm run dev
npm run build
npm run lint
npm run fix-lint
npm run test
```

- `npm run dev`: launches `ray develop` with live reload.
- `npm run build`: validates and bundles through `ray build`; required before publishing.
- `npm run lint`: runs the Raycast lint pipeline (requires internet for schema checks).
- `npm run fix-lint`: applies safe lint/format fixes.
- `npm run test`: executes the Vitest suite for search ranking and doc parsing helpers.

## Coding Style & Naming Conventions

- Strict TypeScript targeting ES2023 with module CommonJS.
- Prettier enforces 2-space indentation, 120-character line limit, and double quotes.
- Commands export PascalCase components; helper modules export camelCase functions.
- Prefer async/await, graceful error handling with Raycast toasts, and concise inline comments only for complex logic.

## Testing Guidelines

- Unit coverage lives under `src/__tests__/`; keep fixtures minimal but faithful to NumPy markup.
- Add Vitest cases when modifying parsing or ranking logic; run `npm run test` locally.
- Document manual Raycast checks in PR descriptions (inputs tried, expected markdown) until we have broader automation.

## Commit & Pull Request Guidelines

- Follow conventional commits (`feat:`, `fix:`, `chore:`, etc.) for clarity.
- Each PR should summarize changes, list verification steps (`npm run test`, `npm run build`, `npm run lint`), and attach screenshots or screen recordings for UI tweaks.
- **Always update `CHANGELOG.md` after making any changes** to document user-facing modifications, bug fixes, or improvements.
  - Use semantic versioning (MAJOR.MINOR.PATCH) for version numbers
  - Increment PATCH version (e.g., 1.1.0 → 1.1.1) for bug fixes
  - Increment MINOR version (e.g., 1.1.0 → 1.2.0) for new features
  - Increment MAJOR version (e.g., 1.1.0 → 2.0.0) for breaking changes
  - Add entries with format `## [XX] - {PR_MERGE_DATE}` (do not replace {PR_MERGE_DATE} with actual dates)
  - Do not use `[Unreleased]` - always specify a version number
- Always push your branch immediately after each commit to keep remote history in sync.

## Raycast-Specific Tips

- Ensure `package.json` metadata (`commands`, title, licensing) reflects the implemented command.
- Use `ray login` prior to `npm run publish`, and never commit API tokens or personal Raycast data.
- Confirm icons stay within Raycast size requirements and are referenced via relative paths.
