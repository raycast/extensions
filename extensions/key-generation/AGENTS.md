# Repository Guidelines

## Project Structure & Module Organization
The extension code lives in `src/`, with `src/generate.ts` implementing the `generate` Raycast command. Shared utilities should be added under `src/lib/` (create the directory if needed) to keep command files focused. UI assets and icons belong in `assets/`, while configuration stays in the project root (`package.json`, `tsconfig.json`, `.prettierrc`). Keep changelog updates in `CHANGELOG.md` so the Raycast Store submission reflects the latest work.

## Build, Test, and Development Commands
Install dependencies with `npm install`. Use `npm run dev` (Ray CLI `ray develop`) for live reloading inside Raycast. Run `npm run build` before publishing to ensure the bundle compiles. Lint the project with `npm run lint`, and auto-fix safe issues via `npm run fix-lint`. When you are ready to ship, `npm run publish` invokes `npx @raycast/api publish` to submit the extension.

## Coding Style & Naming Conventions
This project targets modern TypeScript; prefer async/await and Raycast hook utilities. Prettier enforces a 120-character print width and double quotes; run it before committing. ESLint extends `@raycast/eslint-config`, so follow the Raycast guidelines on React component structure. Use PascalCase for React components, camelCase for helpers, and avoid default exports. Name commands with verbs (`generate`, `copyKey`), matching the Raycast command metadata and file names.

## Testing Guidelines
No automated test harness is configured yet, so prioritize manual verification through `npm run dev`. Validate each change path: argument handling, key preview results, and error notifications. When adding logic-heavy utilities, colocate lightweight unit tests in `src/__tests__/` using your preferred runner (Vitest recommended) and document setup steps in the PR. Record manual test notes in the PR description to aid reviewers.

## Commit & Pull Request Guidelines
The repository snapshot lacks prior commits; adopt Conventional Commits (e.g., `feat: add rsa key preset`) to keep history scannable. Each PR should describe user-facing behavior, list manual or automated test results, and link the relevant issue or Raycast submission. Include screenshots or screen recordings for UI changes. Request review from another agent before merging or publishing.

## Security & Configuration Tips
Never log or store generated secrets. If you introduce external services, load credentials from Raycast preferences rather than hardcoding. Keep API keys out of the repo, and add new environment variables to the contributor instructions in the PR.
