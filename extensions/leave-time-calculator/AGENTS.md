# Repository Guidelines

## Behavior

response in English only.

## Project Structure & Module Organization

- `src/calculate-leave-time.tsx`: main Raycast command UI and background subtitle updater.
- `src/lib/`: shared logic and types.
- `src/lib/time-utils.ts`: leave-time and remaining-time calculations.
- `src/lib/storage.ts`: Raycast `LocalStorage` access for daily start time state.
- `tests/`: Vitest suites (currently `tests/time-utils.test.ts`).
- `assets/`: icon assets used in extension metadata and docs.

## Build, Test, and Development Commands

- `bun install`: install dependencies.
- `bun run dev`: run Raycast development mode (`ray develop`).
- `bun run build`: create production build in `dist/`.
- `bun run test`: run Vitest tests.
- `bun run lint`: run Raycast lint checks.
- `bun run check`: run Biome lint/format checks.
- `bun run format`: apply Biome formatting.

## Coding Style & Naming Conventions

- Language: TypeScript + React (Raycast API).
- Formatting is enforced by Biome (`biome.json`): tabs for indentation, double quotes.
- Keep reusable logic in `src/lib/`; keep command rendering/event wiring in command files.
- Use descriptive `camelCase` for variables/functions and `PascalCase` for React components.
- Keep time values in `HH:MM` string format unless a `Date` object is explicitly needed.

## Testing Guidelines

- Framework: Vitest (`vitest.config.ts`) with `node` environment and globals enabled.
- Place tests under `tests/` and use `*.test.ts` naming.
- Mirror source responsibility in test names, for example `describe("calculateLeaveTime")`.
- Cover daytime and overnight edge cases; use fake timers (`vi.useFakeTimers`) when testing time-dependent behavior.
- Run `bun run test` locally before opening a PR.

## Commit & Pull Request Guidelines

- Prefer Conventional Commit prefixes visible in history: `feat:`, `fix:`, `docs:`, `chore:`.
- Keep commit subjects imperative and specific (example: `fix: handle overnight leave rollover`).
- PRs should include a concise summary, linked issue (if applicable), updated tests for logic changes, and screenshots for UI/metadata updates.
- Ensure CI passes (`lint`, `check`, `build`, `test`) before requesting review.
