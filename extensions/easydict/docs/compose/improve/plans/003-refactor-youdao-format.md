# Plan 003: Refactor Massive Youdao Format Data Logic

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/improve/plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat HEAD..HEAD -- src/providers/dictionary/youdao/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: 001
- **Category**: tech-debt
- **Planned at**: commit `HEAD`, 2026-06-25

## Why this matters

`src/providers/dictionary/youdao/formatData.ts` (586 lines) and `types.ts` (1080 lines) have become massive "god files". They contain the formatting and type definitions for an extensive array of dictionaries (Web, Baike, Collins, EE, etc.). This makes modifying Youdao formatting logic high-risk, as cognitive load is extreme. Splitting these files by domain makes the code easier to maintain and test.

## Current state

- `src/providers/dictionary/youdao/formatData.ts` — Contains one giant set of formatting functions spanning ~600 lines.
- `src/providers/dictionary/youdao/types.ts` — A monolith of type definitions.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `npx tsc --noEmit`       | exit 0, no errors   |
| Lint      | `npm run lint`           | exit 0              |
| Test      | `npm run test`           | exit 0              |

## Scope

**In scope**:
- `src/providers/dictionary/youdao/formatData.ts`
- `src/providers/dictionary/youdao/types.ts`
- `src/providers/dictionary/youdao/formatters/*` (create new directory)
- `src/providers/dictionary/youdao/types/*` (create new directory)
- `src/providers/dictionary/youdao/index.ts` (update imports)

**Out of scope**:
- Changing the actual data structure or UI output of the formatting functions.
- Modifying other dictionary providers.

## Git workflow

- Branch: `advisor/003-refactor-youdao-format`
- Commit message style: `refactor(youdao): split formatData and types into specialized domain modules`

## Steps

### Step 1: Create types directory and split `types.ts`

Create a folder `src/providers/dictionary/youdao/types/`.
Move logic out of `types.ts` into smaller cohesive files:
- `baike.ts`
- `collins.ts`
- `web.ts`
- `translation.ts`
Create an `index.ts` inside `types/` that exports all of them, so the existing consumers don't break immediately.

**Verify**: `npx tsc --noEmit` -> exit 0.

### Step 2: Create formatters directory and split `formatData.ts`

Create a folder `src/providers/dictionary/youdao/formatters/`.
Move formatting functions out of `formatData.ts` into:
- `formatBaike.ts`
- `formatCollins.ts`
- `formatWeb.ts`
Create an `index.ts` in `formatters/` to expose the main `formatDictionary` and `formatTranslation` entry points.

**Verify**: `npx tsc --noEmit` -> exit 0.

### Step 3: Cleanup old files and fix imports

Remove the old `types.ts` and `formatData.ts`. Update `src/providers/dictionary/youdao/index.ts` and any other dependents to point to the new `types/index.ts` and `formatters/index.ts`.

**Verify**: `npm run lint` -> exit 0.

## Test plan

- Create `src/providers/dictionary/youdao/formatters/formatBaike.test.ts` (or similar).
- Add 1-2 snapshot tests using mocked JSON responses to ensure the structural outputs did not change after refactoring.
- **Verification**: `npm run test` -> passes.

## Done criteria

- [ ] `npx tsc --noEmit` exits 0.
- [ ] `npm run test` exits 0.
- [ ] `formatData.ts` and `types.ts` no longer exist as monolithic files.
- [ ] `docs/improve/plans/README.md` status row updated to DONE.

## STOP conditions

Stop and report back (do not improvise) if:
- Circular dependencies emerge while splitting the files.

## Maintenance notes

- Future PRs adding support for new Youdao dictionary sub-types should create a new isolated file in `formatters/` and `types/` rather than adding to a monolith.
