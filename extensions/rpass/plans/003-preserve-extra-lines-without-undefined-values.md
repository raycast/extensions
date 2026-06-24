# Plan 003: Preserve extra entry lines without undefined row values

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 1cf4ad9..HEAD -- src/vault/domain/vault-entry-content.ts src/rpass/application/rpass-client.ts package.json`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, stop and report.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-restore-lint-baseline.md; plans/002-add-rpass-client-contract-tests.md recommended first
- **Category**: bug
- **Planned at**: commit `1cf4ad9`, 2026-06-11

## Why this matters

The updated `rpass` CLI preserves password-store content shape: password on the first line, structured fields, optional OTP URI, and extra metadata as plain text lines. The extension currently flattens JSON back to newline text and parses each non-password line as `name: value`. Lines without a colon can produce `value === undefined`, which can render as `undefined` or be passed to clipboard/paste actions. The UI should preserve extra lines safely instead of inventing undefined values.

## Current state

Relevant files:

- `src/rpass/application/rpass-client.ts` — converts `show --json` into newline text.
- `src/vault/domain/vault-entry-content.ts` — parses newline text into UI rows.
- New or existing test file: `src/vault/domain/vault-entry-content.test.ts`.
- `package.json` — test script may need to include the new test file.

Current excerpts:

```ts
// src/rpass/application/rpass-client.ts:125-133
function formatShowEntryOutput(entry: ShowEntryJson): string {
  return [
    entry.password,
    ...entry.fields.map((field) => `${field.name}: ${field.value}`),
    entry.otp_uri,
    ...entry.extra_lines,
  ]
    .filter(Boolean)
    .join("\n");
}
```

```ts
// src/vault/domain/vault-entry-content.ts:9-18
export function parseVaultEntryRows(content: string): VaultEntryRow[] {
  return content
    .split("\n")
    .filter(Boolean)
    .map((line, idx) => {
      if (TOTP_PATTERN.test(line)) return { idx, name: "otpauth", value: line };
      if (idx === 0) return { idx, name: "pass", value: line };
      const [name, value] = line.split(/:\s?(.*)/, 2);
      return { idx, name, value };
    });
}
```

Existing test style uses Node's built-in runner:

```ts
import assert from "node:assert/strict";
import test from "node:test";
```

Repo conventions:

- Keep domain parsing in `src/vault/domain/*`; UI components consume `VaultEntryRow`.
- Use dummy data only; no real credentials or domains.

## Commands you will need

| Purpose   | Command                                             | Expected on success                    |
| --------- | --------------------------------------------------- | -------------------------------------- |
| Typecheck | `npx tsc --noEmit`                                  | exit 0                                 |
| Tests     | `npm test`                                          | exit 0, including the new parser tests |
| Lint      | `npm run lint -- --exit-on-error --non-interactive` | exit 0 after plan 001                  |

## Scope

**In scope**:

- `src/vault/domain/vault-entry-content.ts`
- `src/vault/domain/vault-entry-content.test.ts` (create if absent)
- `package.json` test script only, if needed.
- `src/rpass/application/rpass-client.ts` only if plan 002's tests reveal `formatShowEntryOutput` needs a small adjustment.

**Out of scope**:

- Raycast UI redesign.
- Changing the `rpass show --json` contract.
- Adding new row types unless needed to safely represent extra lines.

## Git workflow

- Suggested branch: `advisor/003-preserve-extra-lines`.
- Commit message if committing: `fix(vault): preserve extra entry lines`.
- Do not push unless instructed.

## Steps

### Step 1: Add parser regression tests

Create `src/vault/domain/vault-entry-content.test.ts` following the existing `node:test` pattern. Cover at least:

1. First line becomes `{ name: "pass", value: "dummy-password" }`.
2. `username: demo` becomes `{ name: "username", value: "demo" }`.
3. A line without a colon, e.g. `recovery note`, does not produce `value: undefined`; choose an explicit stable representation such as `{ name: "note", value: "recovery note" }` or `{ name: "recovery note", value: "" }`.
4. Lines with colons in the value, e.g. `url: https://example.invalid/login`, preserve the full value.
5. `otpauth://totp/...` remains `{ name: "otpauth", value: line }`.

**Verify**: `npx tsx --test src/vault/domain/vault-entry-content.test.ts` → tests should fail before the implementation change for the no-colon case, then pass after step 2.

### Step 2: Make `parseVaultEntryRows` total for all non-empty lines

Update `parseVaultEntryRows` so every returned `VaultEntryRow` has a string `value`. Do not allow `undefined`.

Suggested shape:

```ts
const [name, value] = line.split(/:\s?(.*)/, 2);
if (value === undefined) return { idx, name: "note", value: line };
return { idx, name, value };
```

If you choose a different row name than `note`, make it explicit in tests and keep it user-readable.

**Verify**: `npx tsx --test src/vault/domain/vault-entry-content.test.ts` → all parser tests pass.

### Step 3: Include the parser tests in `npm test`

Update `package.json` so `npm test` includes `src/vault/domain/vault-entry-content.test.ts` along with existing tests and any test added by plan 002.

**Verify**: `npm test` → all tests pass.

### Step 4: Run full verification

**Verify**:

- `npx tsc --noEmit` → exit 0.
- `npm test` → exit 0.
- `npm run lint -- --exit-on-error --non-interactive` → exit 0.

## Test plan

New tests in `src/vault/domain/vault-entry-content.test.ts` must cover password, fields, colon-containing values, OTP URI, and plain extra lines with no colon.

## Done criteria

- [ ] No `VaultEntryRow` returned by `parseVaultEntryRows` can have `value === undefined`.
- [ ] Extra lines without `:` are preserved in a stable, user-readable row.
- [ ] `npm test` includes and passes the new parser tests.
- [ ] `npx tsc --noEmit`, `npm test`, and `npm run lint -- --exit-on-error --non-interactive` exit 0.
- [ ] No files outside the in-scope list are modified.
- [ ] `plans/README.md` status row for plan 003 is updated.

## STOP conditions

Stop and report if:

- The live code already has a richer typed representation for `rpass show --json`; this plan should be rewritten to use that instead of text round-tripping.
- Fixing the bug appears to require changing Raycast presentation components beyond simple row rendering.
- Tests require real decrypted password-store content.

## Maintenance notes

This keeps the existing text-based interface between `rpass-client` and vault parsing. A future refactor could pass typed `ShowEntryJson` through the app instead, but that should be a separate plan with UI tests.
