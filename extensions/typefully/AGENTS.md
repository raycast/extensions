# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the TypeScript/React Raycast commands; entrypoints map to commands like `src/create-draft.tsx`, `src/drafts.tsx`, `src/social-sets.tsx`, and `src/account.tsx`.
- Shared logic lives in `src/api.ts` (Typefully client), `src/types.ts`, `src/constants.ts`, `src/utils.ts`, and `src/preferences.ts`.
- `assets/` stores `extension-icon.png`; `api.json` is the Typefully OpenAPI spec; `package.json` is the Raycast manifest; `raycast-env.d.ts` provides types.

## Build, Test, and Development Commands
- `npm install` installs dependencies.
- `npm run dev` runs `ray develop` for local Raycast development.
- `npm run build` runs `ray build -e dist` to bundle the extension.
- `npm run lint` runs `ray lint` for linting.

## Coding Style & Naming Conventions
- TypeScript + React (JSX); 2-space indentation, semicolons, and double quotes match existing files.
- Use PascalCase for components, camelCase for functions/variables, and kebab-case for command files (e.g., `create-draft.tsx`).
- Keep API payload keys aligned with Typefully API expectations (snake_case like `draft_title`).
- Prefer adding shared helpers in `src/utils.ts` and types in `src/types.ts`.

## Testing Guidelines
- No automated test suite is set up yet.
- For manual checks, run `npm run dev`, open the Raycast extension, and exercise each command. Verify missing API key and rate-limit behavior.

## Commit & Pull Request Guidelines
- Git history is not available in this workspace; use short imperative messages or Conventional Commits (`feat:`, `fix:`, `chore:`).
- PRs should include a summary, commands run, and screenshots/GIFs for UI changes; link relevant issues or API changes.

## Configuration & Secrets
- Set the Typefully API key in Raycast preferences; never commit secrets.
- Use `api.json` as the API reference when adjusting request/response shape.
