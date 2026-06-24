# Plan 001: Restore the Raycast lint baseline

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 1cf4ad9..HEAD -- package.json src/vault/presentation/store.tsx`
> If either file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, stop and report.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `1cf4ad9`, 2026-06-11

## Why this matters

The repo currently has a broken lint gate. `npx tsc --noEmit` and `npm test` pass, but `npm run lint -- --exit-on-error --non-interactive` exits non-zero because Raycast/Prettier reports a formatting issue in `src/vault/presentation/store.tsx`. The same lint run also warns that the extension title is not title-cased. A clean baseline should land before behavior changes so future plans do not mix feature diffs with formatting-only changes.

## Current state

Relevant files:

- `src/vault/presentation/store.tsx` — Raycast list UI for vault entries; currently reported by Prettier.
- `package.json` — Raycast extension manifest; title casing warning is here.

Current excerpts:

```tsx
// src/vault/presentation/store.tsx:38-44
return (
  <List.Dropdown
    tooltip="Filter by Folder"
    value={selectedFolder}
    onChange={onChange}
  >
    <List.Dropdown.Item icon={Icon.Folder} title="All" value={ALL_FOLDERS} />
```

```json
// package.json:106
"title": "rPass",
```

Observed verification output before this plan:

```text
npm run lint -- --exit-on-error --non-interactive
...
warning  Extension's title has to be Title Cased. Expected "RPass"
...
error  Code style issues found. Please run Prettier 3.8.3 (ray lint --fix).
```

Repo conventions:

- TypeScript/React Raycast extension.
- Existing formatting is whatever `ray lint`/Prettier expects; do not introduce a new formatter.
- Commits in `git log` use lowercase conventional commits, e.g. `fix(vault): handle strict rpass json output`.

## Commands you will need

| Purpose   | Command                                             | Expected on success                                     |
| --------- | --------------------------------------------------- | ------------------------------------------------------- |
| Typecheck | `npx tsc --noEmit`                                  | exit 0, no output                                       |
| Tests     | `npm test`                                          | exit 0, all 12 existing tests pass before this plan     |
| Lint      | `npm run lint -- --exit-on-error --non-interactive` | exit 0, no error; the title warning should also be gone |

## Scope

**In scope**:

- `src/vault/presentation/store.tsx`
- `package.json`

**Out of scope**:

- Any behavior changes to the vault list.
- Any dependency updates.
- Any changes to `package-lock.json`.
- Running `ray lint --fix` is allowed only if it modifies in-scope files; if it tries to modify anything else, stop and report.

## Git workflow

- Suggested branch: `advisor/001-restore-lint-baseline`.
- Commit message if committing: `build(lint): restore raycast lint baseline`.
- Do not push unless instructed.

## Steps

### Step 1: Fix package title casing

In `package.json`, change the top-level title from `rPass` to `RPass`.

**Verify**: `node -e "const p=require('./package.json'); console.log(p.title)"` → prints exactly `RPass`.

### Step 2: Apply the expected Prettier formatting to `store.tsx`

Format only `src/vault/presentation/store.tsx` according to Raycast/Prettier. Prefer a targeted manual format or `npx prettier --write src/vault/presentation/store.tsx`. Do not make semantic changes.

**Verify**: `git diff -- src/vault/presentation/store.tsx package.json` → diff contains only formatting and the title-case manifest change.

### Step 3: Run the full local baseline

Run the three gates below.

**Verify**:

- `npx tsc --noEmit` → exit 0.
- `npm test` → exit 0, all tests pass.
- `npm run lint -- --exit-on-error --non-interactive` → exit 0.

## Test plan

No new tests are required for this DX-only change. Existing tests must remain green.

## Done criteria

- [ ] `package.json` top-level `title` is exactly `RPass`.
- [ ] `src/vault/presentation/store.tsx` passes Raycast/Prettier formatting.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] `npm test` exits 0.
- [ ] `npm run lint -- --exit-on-error --non-interactive` exits 0.
- [ ] No files outside the in-scope list are modified.
- [ ] `plans/README.md` status row for plan 001 is updated.

## STOP conditions

Stop and report if:

- The drift check shows semantic changes in either in-scope file and the excerpts no longer match.
- `ray lint --fix` or Prettier attempts to modify files outside scope.
- Lint still fails after formatting and title casing are fixed.

## Maintenance notes

This plan establishes the quality baseline used by the later plans. Reviewers should reject any unrelated behavior change in this diff.
