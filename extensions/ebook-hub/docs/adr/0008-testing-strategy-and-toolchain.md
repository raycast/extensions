# ADR-0008: Testing Strategy, Coverage Gate, and Toolchain Versions

- Status: Accepted
- Date: 2026-09-15

## Context

Ebook Hub must keep test coverage above 95% across all of `src/`, including
Raycast views. Raycast APIs only exist inside the Raycast app, so views cannot
run in a plain test runner. Dependency versions are also constrained: Raycast
runs extensions on its own bundled Node.js runtime (22.22.2 at the time of
writing), and `@raycast/api` pins `@types/node`, `react`, and `@types/react`.

## Decision

- **Runner**: Vitest with V8 coverage. `npm run test:coverage` fails when
  statements, branches, functions, or lines drop below 95% for
  `src/**/*.{ts,tsx}`. Only test files and the test doubles in `src/test/` are
  excluded.
- **Views**: rendered with Testing Library in happy-dom
  (`// @vitest-environment happy-dom` per file). `vitest.config.mts` aliases
  `@raycast/api` and `@raycast/utils` to accessible DOM doubles in `src/test/`.
  The doubles keep pushed views mounted like Raycast, record toasts, and
  implement the `usePromise`, `useCachedPromise`, and `useForm` behavior the
  extension relies on.
- **Thin views**: decision logic lives in pure modules (for example
  `src/domain/reader-navigation.ts`) so views mostly wire state to actions.
- **Toolchain**:
  - Node.js 24 LTS for development and CI (`.nvmrc`).
  - ESLint 10 and TypeScript 6.0 — the newest TypeScript that
    `typescript-eslint` supports (`<6.1.0`).
  - `@types/node` stays on 22.x and React on 19.0 to match `@raycast/api` and
    the Raycast runtime. Node 24 typings would allow APIs that crash inside
    Raycast.

## Consequences

- The doubles can drift from real Raycast behavior. Keep them minimal and walk
  through the main flows with `npm run dev` before each release.
- Upgrade `@types/node` and React only when `@raycast/api` does.
- Storage failure tests use file permissions and assume a non-root user.

## Alternatives Considered

- **Exclude views from coverage** — faster, but leaves the UI unmeasured and
  does not meet the coverage requirement. Rejected.
- **react-test-renderer** — deprecated in React 19. Rejected.
- **Jest** — slower and needs extra TypeScript and ESM transforms. Rejected.
