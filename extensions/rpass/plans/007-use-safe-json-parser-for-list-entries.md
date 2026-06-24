# Plan 007: Use the safe JSON parser for list entries

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 1cf4ad9..HEAD -- src/rpass/application/rpass-client.ts src/rpass/application/rpass-client.test.ts package.json`
> If in-scope files changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, stop and report.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/002-add-rpass-client-contract-tests.md
- **Category**: bug
- **Planned at**: commit `1cf4ad9`, 2026-06-11

## Why this matters

`showEntry` and `generateOtp` already convert invalid stdout JSON into a structured `RpassError` with code `rpass_invalid_json`. `listEntries` still calls `JSON.parse` directly, which can throw a raw `SyntaxError`. That inconsistency makes UI error handling and tests harder, especially after the updated CLI contract requires commands accepting `--json` to return one complete JSON value on success.

## Current state

Relevant files:

- `src/rpass/application/rpass-client.ts` — JSON parsing lives here.
- `src/rpass/application/rpass-client.test.ts` — should exist after plan 002; add/extend tests here.

Current excerpts:

```ts
// src/rpass/application/rpass-client.ts:101-103
export async function listEntries(storeDir: string): Promise<string[]> {
  const stdout = await run(["--store-dir", storeDir, "list", "--json"]);
  return JSON.parse(stdout) as string[];
}
```

```ts
// src/rpass/application/rpass-client.ts:113-123
function parseJson<T>(stdout: string): T {
  try {
    return JSON.parse(stdout) as T;
  } catch (error) {
    throw new RpassError(
      "rpass_invalid_json",
      "rpass returned invalid JSON",
      error instanceof Error ? error.message : String(error),
    );
  }
}
```

Repo conventions:

- Keep JSON parsing errors as `RpassError` objects.
- Tests should use the fake CLI seam created by plan 002.

## Commands you will need

| Purpose   | Command                                             | Expected on success   |
| --------- | --------------------------------------------------- | --------------------- |
| Typecheck | `npx tsc --noEmit`                                  | exit 0                |
| Tests     | `npm test`                                          | exit 0                |
| Lint      | `npm run lint -- --exit-on-error --non-interactive` | exit 0 after plan 001 |

## Scope

**In scope**:

- `src/rpass/application/rpass-client.ts`
- `src/rpass/application/rpass-client.test.ts`
- `package.json` only if the rpass-client test is not yet included.

**Out of scope**:

- Schema validation of JSON shapes beyond parse errors.
- Changing `showEntry` or `generateOtp` behavior except to keep tests passing.
- Adding dependencies.

## Git workflow

- Suggested branch: `advisor/007-safe-list-json-parser`.
- Commit message if committing: `fix(rpass): normalize list json errors`.
- Do not push unless instructed.

## Steps

### Step 1: Add a regression test for invalid list JSON

In `src/rpass/application/rpass-client.test.ts`, add a test where the fake CLI exits 0 for `list --json` but writes invalid JSON, e.g. `not-json`.

Assert that `listEntries(store)` rejects with `RpassError` and `error.code === "rpass_invalid_json"`.

**Verify**: `npx tsx --test src/rpass/application/rpass-client.test.ts` → this test should fail before step 2 if `listEntries` still throws `SyntaxError`.

### Step 2: Reuse `parseJson` in `listEntries`

Change `listEntries` to:

```ts
return parseJson<string[]>(stdout);
```

Do not otherwise change argv construction.

**Verify**: `npx tsx --test src/rpass/application/rpass-client.test.ts` → all rpass client tests pass.

### Step 3: Run full verification

**Verify**:

- `npx tsc --noEmit` → exit 0.
- `npm test` → exit 0.
- `npm run lint -- --exit-on-error --non-interactive` → exit 0.

## Test plan

Add one focused test to the plan 002 client test suite. Existing success tests for `listEntries` should still prove valid JSON arrays parse correctly.

## Done criteria

- [ ] `listEntries` uses `parseJson<string[]>` or an equivalent structured parser.
- [ ] Invalid `list --json` stdout rejects with `RpassError` code `rpass_invalid_json`.
- [ ] Existing list success behavior is unchanged.
- [ ] `npx tsc --noEmit`, `npm test`, and `npm run lint -- --exit-on-error --non-interactive` exit 0.
- [ ] No files outside the in-scope list are modified.
- [ ] `plans/README.md` status row for plan 007 is updated.

## STOP conditions

Stop and report if:

- Plan 002 was not completed and no test seam exists; do not invent a broad testing architecture in this small plan.
- The live client now performs schema validation and this finding is already fixed.
- Fixing this requires changing UI error handling.

## Maintenance notes

This plan handles parse errors only. It does not validate that parsed JSON is actually `string[]`; add runtime schema validation later only if malformed-but-valid JSON becomes a real issue.
