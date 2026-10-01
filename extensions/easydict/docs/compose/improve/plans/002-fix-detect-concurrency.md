# Plan 002: Fix Concurrency Bug in Language Detection

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/improve/plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat HEAD..HEAD -- src/core/detect/index.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED
- **Depends on**: 001
- **Category**: bug
- **Planned at**: commit `HEAD`, 2026-06-25

## Why this matters

The core language detection logic relies on mutable module-level globals (`apiDetectedLanguageList` and `hasDetectFinished`). When a user triggers multiple detection requests concurrently (e.g. rapid typing), `detectLanguage` mutates these shared arrays/flags. This causes race conditions, meaning the first API call's resolution might interact with the state of the second API call, leading to unresolved promises or incorrect language assignments.

## Current state

- `src/core/detect/index.ts` — The global mutation occurs here:
  ```typescript
  // lines 23-27
  let apiDetectedLanguageList: DetectedLangModel[];
  const defaultConfirmedConfidence = 0.8;
  let hasDetectFinished = false;

  export async function detectLanguage(text: string): Promise<DetectedLangModel> {
    apiDetectedLanguageList = []; // <--- GLOBAL MUTATION
  ```

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `npx tsc --noEmit`       | exit 0, no errors   |
| Lint      | `npm run lint`           | exit 0              |
| Test      | `npm run test`           | exit 0              |

## Scope

**In scope**:
- `src/core/detect/index.ts`
- `src/core/detect/index.test.ts` (create)

**Out of scope**:
- Modifications to actual provider logic (`src/providers/detect/*`).
- Changes to the `useQueryEngine` React hook.

## Git workflow

- Branch: `advisor/002-fix-detect-concurrency`
- Commit message style: `fix(detect): remove global mutable state in detectLanguage to fix concurrency`

## Steps

### Step 1: Encapsulate state inside detection context

Refactor `src/core/detect/index.ts` so that `apiDetectedLanguageList` and `hasDetectFinished` are no longer module-level globals. Instead, instantiate a context object or pass them down the call chain inside `detectLanguage`.

Update `raceDetectTextLanguage`, `handleDetectedLanguage`, `getFinalDetectedLanguage`, and `handleFinalDetectedLangFromAPIList` to accept `apiDetectedLanguageList` (and an object wrapper for `hasDetectFinished`, e.g., `{ value: false }`) as arguments.

**Verify**: `npx tsc --noEmit` -> exit 0.

### Step 2: Remove global declarations

Delete `let apiDetectedLanguageList: DetectedLangModel[];` and `let hasDetectFinished = false;` from the top of the file.

**Verify**: `npm run lint` -> exit 0.

## Test plan

- Create `src/core/detect/index.test.ts`.
- Write a test that mocks `detectServices` to simulate two concurrent calls to `detectLanguage` with different texts. Verify that they both resolve correctly and do not interfere with each other's state.
- **Verification**: `npm run test` -> passes.

## Done criteria

- [ ] `npx tsc --noEmit` exits 0.
- [ ] `npm run lint` exits 0.
- [ ] No module-level mutable variables are used in `src/core/detect/index.ts` (excluding cache initializers like `apiDetectors` which are fine if immutable after init).
- [ ] `docs/improve/plans/README.md` status row updated to DONE.

## STOP conditions

Stop and report back (do not improvise) if:
- Extracting the state requires altering `BaseDetectProvider` interface.

## Maintenance notes

- Any future asynchronous state should be securely bound to the invocation closure, not the module level.
