# Plan 001: Establish Verification Baseline (Tests)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/improve/plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat HEAD..HEAD -- package.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `HEAD`, 2026-06-25

## Why this matters

The codebase currently has zero automated test coverage. This is a severe tech debt issue for an application that relies heavily on data transformations and integrating 11+ different API providers. Without a baseline test suite, any refactoring or bug fix carries a high risk of causing regressions that can only be caught through manual verification. Establishing a test baseline unblocks all future safe refactoring.

## Current state

- `package.json` — The scripts section lacks any `test` command.
- `src/utils/text.ts` — A small, pure utility module that is ideal for demonstrating the first unit tests.

Repo conventions: Uses `npm`, runs formatting via `prettier` and `eslint`. We should use a modern, zero-config testing framework like `vitest` that natively supports TypeScript out of the box, aligning with the `raycast` extension architecture.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Install   | `npm install`            | exit 0              |
| Typecheck | `npx tsc --noEmit`       | exit 0, no errors   |
| Tests     | `npm run test`           | all pass            |
| Lint      | `npm run lint`           | exit 0              |

## Scope

**In scope**:
- `package.json`
- `vitest.config.ts` (create)
- `src/utils/text.test.ts` (create)

**Out of scope**:
- Writing comprehensive tests for the entire application. We only want to establish the infrastructure and baseline patterns.

## Git workflow

- Branch: `advisor/001-establish-test-baseline`
- Commit message style: `test(setup): add vitest and base utility tests`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Install Vitest and set up configuration

Install `vitest` as a dev dependency and create a basic configuration to handle path aliases (`@/*`).

```bash
npm install -D vitest
```

Create `vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

**Verify**: `cat vitest.config.ts` -> file exists.

### Step 2: Add test script to package.json

Update the `scripts` section of `package.json` to include `"test": "vitest run"` and `"test:watch": "vitest"`.

**Verify**: `grep test package.json` -> shows the newly added test commands.

### Step 3: Write characterization tests for `text.ts`

Create `src/utils/text.test.ts` to test the pure functions in `text.ts` (e.g. string formatting or parsing). Write 2-3 simple assertions.

**Verify**: `npm run test` -> exit 0, all tests pass.

## Test plan

- No further tests required, this plan *is* the test plan.

## Done criteria

- [ ] `npm run test` executes `vitest` and exits 0 with >= 1 test passing.
- [ ] `vitest.config.ts` is created and correctly aliases `@/`.
- [ ] `package.json` includes `test` and `test:watch` scripts.
- [ ] `docs/improve/plans/README.md` status row updated to DONE.

## STOP conditions

Stop and report back (do not improvise) if:
- `npm run test` fails due to Raycast specific module resolution issues (e.g., `@raycast/api` requires mocking).

## Maintenance notes

- Future refactoring plans can now explicitly require unit tests for their changes.
- Reviewers should ensure that subsequent PRs include `*.test.ts` files for logic changes.
