# Plan 005: Establish a Vitest baseline for query-state behavior

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat e6ac2e8..HEAD -- package.json package-lock.json vitest.config.ts src/core/query`
> If an in-scope file changed since this plan was written, compare the current
> code against the excerpts below. If action semantics or coupling rules changed,
> stop and ask for the plan to be refreshed.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests / dx
- **Planned at**: commit `e6ac2e8`, 2026-07-18

## Why this matters

The repository has type checking, linting, and build verification, but no test
runner and no `test` script. The next fix changes the asynchronous query state
machine; without characterization tests, an executor cannot distinguish a race
fix from a regression in loading, result replacement, or dictionary coupling.
This plan adds the smallest useful test layer around pure query-domain behavior.
It does not test provider networks or Raycast UI rendering.

## Current state

- `package.json` — scripts include `build`, `lint`, and `fix-lint`; there is no
  `test` script and no test framework in `devDependencies`.
- `src/core/query/queryReducer.ts:59-75` — `QueryAction` defines the complete
  state transition surface (`START_QUERY`, `FINISH_QUERY`, `SET_RESULT`,
  `CLEAR_ALL`, `RESET_FOR_NEW_QUERY`, and related actions).
- `src/core/query/queryReducer.ts:87-101` — pending providers are deduplicated
  and loading stops when the pending list becomes empty:

  ```ts
  case "START_QUERY": {
    if (state.queryRecordList.includes(action.queryType)) return state;
    return {
      ...state,
      queryRecordList: [...state.queryRecordList, action.queryType],
      isLoading: true,
    };
  }

  case "FINISH_QUERY": {
    const newList = state.queryRecordList.filter((t) => t !== action.queryType);
    if (newList.length === state.queryRecordList.length) return state;
    return { ...state, queryRecordList: newList, isLoading: newList.length > 0 };
  }
  ```

- `src/core/query/queryReducer.ts:104-125` — a result replaces the previous
  result of the same provider type, is sorted, and then passes through coupling
  rules.
- `src/core/query/queryReducer.ts:143-160` — `CLEAR_ALL` empties results and
  pending work; `RESET_FOR_NEW_QUERY` preserves old visible results while
  clearing pending work and setting loading true. Preserve that distinction.
- `src/core/query/couplingRules.ts:30-69` — `applyTranslationToDisplay` performs
  an immutable update of only the first item in the target's first section.
- `src/core/query/couplingRules.ts:77-102` — Youdao phonetic/exam metadata is
  immutably copied into Linguee's first accessory item.
- Cross-module imports use the `@/` alias. Tests should import `describe`, `it`,
  `expect`, and `vi` explicitly from `vitest`; do not add global test types.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Add runner | `npm install --save-dev vitest` | exit 0; manifest and lockfile updated |
| Tests | `npm test` | exit 0; all query tests pass |
| Typecheck | `npx tsc --noEmit` | exit 0, no errors |
| Lint/fix | `npm run fix-lint` | exit 0 |
| Build | `npm run build` | exit 0; extension builds successfully |

## Suggested executor toolkit

- Use the `raycast-extension` skill if available. Keep the test runner local to
  development; Raycast command architecture and runtime dependencies must not
  change.

## Scope

**In scope** (the only files to modify or create):

- `package.json`
- `package-lock.json`
- `vitest.config.ts` (create)
- `src/core/query/queryReducer.test.ts` (create)
- `src/core/query/couplingRules.test.ts` (create)
- `plans/README.md` (status only)

**Out of scope** (do not touch):

- Production source behavior in `src/core/query/*.ts`.
- Hook, UI, provider, language-detection, and audio code.
- Snapshot tests, live provider requests, or Raycast process integration tests.
- `.github/workflows/` and all GitHub Actions.
- `SECURITY.md`, vulnerability-reporting instructions, and the embedded Caiyun
  credential location.

## Git workflow

- Branch: follow the operator's current branch unless told to create one; if a
  branch is required, use `codex/005-query-test-baseline`.
- Use an atomic conventional commit such as
  `test(query): establish reducer characterization coverage`.
- Do not push or open a pull request unless explicitly instructed.

## Steps

### Step 1: Add the local Vitest runner

1. Run `npm install --save-dev vitest`; do not use yarn, pnpm, or bun.
2. Add these scripts to `package.json`:

   ```json
   "test": "vitest run",
   "test:watch": "vitest"
   ```

3. Create `vitest.config.ts` using `defineConfig` from `vitest/config`.
   Configure only the `@` alias, resolving it to the repository's `src`
   directory via `fileURLToPath(new URL("./src", import.meta.url))`.
   Keep the default Node environment; do not add jsdom in this plan.

**Verify**: `npm test -- --passWithNoTests` → exit 0 before tests are added.

### Step 2: Characterize reducer transitions

Create `src/core/query/queryReducer.test.ts`.

1. Mock `@/consts` with a minimal `myPreferences` object and mock
   `@/core/config` with `{ config: { servicesOrder: [] } }`. This prevents tests
   from loading Raycast native preferences while keeping the real reducer,
   sorting logic, and coupling rules under test.
2. Add typed fixture builders for `QueryState` and `QueryResult`; do not use
   `any` or double casts. Use real `DictionaryType` / `TranslationType` values
   and real `LanguageItem` objects from `src/core/language/consts.ts`.
3. Cover these behaviors:

   - duplicate `START_QUERY` does not duplicate a provider in
     `queryRecordList`;
   - `FINISH_QUERY` removes only its provider and stops loading only after the
     final pending provider finishes;
   - `SET_RESULT` replaces an earlier result of the same provider type;
   - a DeepL + Linguee result pair applies the existing title/copy coupling;
   - `RESET_FOR_NEW_QUERY` preserves `queryResults`, clears pending providers,
     and sets `isLoading` true;
   - `CLEAR_ALL` empties results and pending providers and resets detail/loading.

Do not assert implementation-only object identities except where the reducer's
documented no-op behavior is itself under test.

**Verify**: `npm test -- src/core/query/queryReducer.test.ts` → all tests pass.

### Step 3: Characterize coupling helpers directly

Create `src/core/query/couplingRules.test.ts` with focused fixtures. Cover:

- `applyTranslationToDisplay` changes only the first item of the target's first
  section and does not mutate the input object graph;
- `minSections` prevents an update when the target has too few sections;
- missing source, target, or source text returns the original result array;
- `applyMetadataToLinguee` merges phonetic/exam metadata while preserving an
  existing accessory field such as `example`;
- missing metadata leaves the input unchanged.

If the existing coupling helpers log to the console, spy on and restore
`console.log` inside the relevant tests; do not change production logging in
this plan.

**Verify**: `npm test -- src/core/query/couplingRules.test.ts` → all tests pass.

### Step 4: Run the complete repository gate

Run in this order:

1. `npm test`
2. `npx tsc --noEmit`
3. `npm run fix-lint`
4. `npm test` again if lint changed any test file
5. `npm run build`

**Verify**: every command exits 0. Raycast metadata validation may require
network access; a sandbox/network failure is not permission to skip the gate.

## Test plan

- Two new test files cover the reducer state machine and the pure cross-service
  transforms.
- No snapshots. Assertions must name the exact state fields and nested display
  fields whose behavior is protected.
- Expected minimum: six reducer cases and five coupling-helper cases. Multiple
  assertions may live in one case when they describe one transition.

## Done criteria

- [ ] `package.json` contains `test` and `test:watch` scripts and Vitest is a
      dev dependency; `package-lock.json` matches.
- [ ] `npm test` exits 0 with reducer and coupling tests discovered.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] `npm run fix-lint` exits 0.
- [ ] `npm run build` exits 0.
- [ ] No production source behavior changed.
- [ ] `git diff --name-only` contains only the in-scope files.
- [ ] Plan 005 is marked DONE in `plans/README.md`.

## STOP conditions

Stop and report instead of improvising if:

- Vitest cannot resolve `@/` after the explicit alias configuration.
- Importing the reducer still requires loading an unmockable Raycast native
  module; report the import chain rather than restructuring production code.
- A characterization assertion conflicts with current documented reducer
  comments or with commit `e6ac2e8`; the plan may have drifted.
- Passing the tests requires modifying production query behavior.
- A required change would touch a frozen or out-of-scope file.
- Any verification command fails twice after one reasonable correction.

## Maintenance notes

- These tests are deliberately pure and fast. Provider contract tests and
  Raycast UI tests are separate future layers.
- When query action shapes change in plan 006, update the reducer fixtures but
  preserve all behavioral assertions established here.
- Reviewers should reject broad mocks that replace the reducer/coupling logic
  under test; only Raycast preferences/configuration should be isolated.

