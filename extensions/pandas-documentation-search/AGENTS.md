# Repository Guidelines

This guide helps contributors create and ship updates for the Pandas Documentation Search Raycast extension.

## Project Structure & Module Organization

- `src/pandas-docs.ts`: main Raycast command entry point for Pandas documentation search.
- `assets/extension-icon.png`: Raycast marketplace icon; keep additional static assets here.
- Root configs (`package.json`, `tsconfig.json`, `eslint.config.js`, `.prettierrc`) define extension metadata, TypeScript, and lint/format behavior.

## Build, Lint, and Development Commands

```bash
npm install
npm run dev
npm run build
npm run lint
npm run fix-lint
```

- `npm run dev`: launches `ray develop` with hot reload for local development.
- `npm run build`: validates and bundles the extension through `ray build`.
- `npm run lint`: runs Raycast lint checks.
- `npm run fix-lint`: applies safe lint and formatting fixes.

## Coding Style & Naming Conventions

- Use strict TypeScript and keep modules focused on one concern.
- Follow Prettier defaults in this repo (2-space indentation and double quotes).
- Prefer `async/await`, explicit error handling, and concise user-facing messaging.
- Use clear naming (`camelCase` for functions/variables, `PascalCase` for React components when added).

## Raycast: Create Your First Extension Workflow

Follow the official Raycast flow when bootstrapping a new extension or command:

1. In Raycast, run the **Create Extension** command.
2. Name the extension, choose a template (for example, **Detail**), and select a location.
3. In terminal, enter the new extension folder and run:

```bash
npm install && npm run dev
```

4. Open Raycast and run the created command to verify it loads.
5. Edit the command source (`src/index.tsx` in a new template, or `src/pandas-docs.ts` in this repo), save, and validate hot reload behavior.
6. Stop development with `Ctrl+C` when done; the extension remains available in Raycast.

## Commit & Pull Request Guidelines

- Follow conventional commits (`feat:`, `fix:`, `chore:`, etc.).
- Each PR should summarize behavior changes and list verification steps run (`npm run lint`, `npm run build`, and `npm run dev` manual checks).
- Include screenshots/screen recordings for visible UI changes in Raycast.
- **Always update `CHANGELOG.md` after making user-facing changes.**
  - Use semantic versioning (MAJOR.MINOR.PATCH).
  - Use PATCH for fixes, MINOR for features, MAJOR for breaking changes.
  - Add entries as `## [X.Y.Z] - {PR_MERGE_DATE}`.
  - Do not use `[Unreleased]`.

## Raycast-Specific Tips

- Keep `package.json` metadata (`title`, `description`, `commands`, `categories`, `icon`) aligned with actual behavior.
- Use `npm run publish` for Raycast Store publication (not `npm publish`).
- Use `ray login` before publish flows and never commit tokens or personal Raycast data.
- Ensure icons and assets referenced in the manifest exist and use correct relative paths.
