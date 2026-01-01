# Repository Guidelines

## Project Structure & Module Organization
The extension code lives in `src/`. Command entry points (`index.tsx`, `get-query-log.tsx`, `review-blocked-domains.tsx`) render the Raycast views. Tool integrations (e.g., `tools/unblock-domain.ts`) encapsulate side-effectful operations exposed to AI. Shared logic resides in `utils/` (`adguard-api.ts` hosts REST clients, `domain-helpers.ts` normalizes root domains). Static badges and icons are in `assets/`. Extension metadata and scripts sit in `package.json`; linting and typing config is in `eslint.config.mjs`, `tsconfig.json`, and `raycast-env.d.ts`.

## Build, Test, and Development Commands
- `npm run dev` / `ray develop`: launches the extension in Raycast for interactive development with hot reload.
- `npm run build` / `ray build -e dist`: produces the distributable bundle under `dist/`.
- `npm run lint` / `ray lint`: runs the Raycast ESLint rules over the project.
- `npm run fix-lint`: applies auto-fixes (run before committing).
- `npm run publish`: invokes `@raycast/api` publishing flow when you are ready to submit the extension.

## Coding Style & Naming Conventions
This project follows `@raycast/eslint-config` and Prettier defaults (2-space indent, semicolons, double quotes for JSX, single quotes elsewhere). Use PascalCase for React components and view files, camelCase for functions and helpers, and SCREAMING_SNAKE_CASE for config constants. Prefer functional React patterns with hooks, and keep side-effectful logic in `tools/` so command views stay declarative. Run `npm run lint` after notable refactors to avoid style drift.

## Testing Guidelines
There is no automated test suite yet; use linting as the guardrail. When adding functionality, verify it manually inside Raycast via `npm run dev`, covering both happy path and error dialogs. Add deterministic helpers under `src/utils/` to ease future unit tests and keep business logic pure where possible.

## Commit & Pull Request Guidelines
Commit messages follow Conventional Commits (`feat: …`, `fix: …`, `chore: …`), mirroring the existing history. Keep commits focused on a single concern and run `npm run fix-lint` beforehand. Pull requests should describe the user impact, list Raycast commands touched, note credential requirements, and include screenshots or short recordings of new UI states where relevant. Reference GitHub issues or Raycast review feedback with `Closes #ID` when applicable.

## Security & Configuration Tips
Never hardcode API tokens; rely on Raycast Preferences (`adguardApiToken`, `adguardRefreshToken`, `adguardDnsServerId`). Treat `raycast-env.d.ts` as the canonical source for environment typing. When debugging API calls, prefer mocked data or redacted logs to protect user domains. Rotate demo credentials before publishing artifacts or recordings.
