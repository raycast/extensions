# Plan 002: Add contract tests for the rpass client boundary

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 1cf4ad9..HEAD -- src/rpass/application/rpass-client.ts package.json`
> If in-scope files changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, stop and report.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/001-restore-lint-baseline.md
- **Category**: tests
- **Planned at**: commit `1cf4ad9`, 2026-06-11

## Why this matters

`src/rpass/application/rpass-client.ts` is the extension's trust boundary with the Rust `rpass` CLI. The updated CLI contract in `AGENTS.md` requires JSON stdout/stderr, `--passphrase-stdin` for integrations, and never `--passphrase <value>`. Today, the test script covers only vault item mapping and folder filtering, so a future refactor can silently break the critical CLI contract.

## Current state

Relevant files:

- `src/rpass/application/rpass-client.ts` — spawns `rpass`, parses JSON, maps CLI errors.
- `package.json` — test script currently names only two test files.
- New test file to create: `src/rpass/application/rpass-client.test.ts`.

Current excerpts:

```ts
// src/rpass/application/rpass-client.ts:55-58
const child = spawn(resolveExecutable(), args, {
  stdio: [stdin === undefined ? "ignore" : "pipe", "pipe", "pipe"],
});
```

```ts
// src/rpass/application/rpass-client.ts:101-103
export async function listEntries(storeDir: string): Promise<string[]> {
  const stdout = await run(["--store-dir", storeDir, "list", "--json"]);
  return JSON.parse(stdout) as string[];
}
```

```ts
// src/rpass/application/rpass-client.ts:141-146
const args = ["--store-dir", storeDir, "show", "--json"];
if (passphrase !== undefined) args.push("--passphrase-stdin");
args.push(entry);

const stdout = await run(args, passphrase);
return formatShowEntryOutput(parseJson<ShowEntryJson>(stdout));
```

```json
// package.json scripts
"test": "tsx --test src/vault/domain/vault-item.test.ts src/vault/application/filter-vault-items.test.ts"
```

Existing test style:

```ts
// src/vault/domain/vault-item.test.ts
import assert from "node:assert/strict";
import test from "node:test";
```

Repo conventions:

- Use Node's built-in `node:test` and `node:assert/strict`; do not add a test framework.
- Do not invoke real GPG or a real password store in tests.
- Prefer narrow dependency injection over broad abstractions.

## Commands you will need

| Purpose   | Command                                             | Expected on success                    |
| --------- | --------------------------------------------------- | -------------------------------------- |
| Typecheck | `npx tsc --noEmit`                                  | exit 0                                 |
| Tests     | `npm test`                                          | exit 0, including the new client tests |
| Lint      | `npm run lint -- --exit-on-error --non-interactive` | exit 0 after plan 001                  |

## Scope

**In scope**:

- `src/rpass/application/rpass-client.ts`
- `src/rpass/application/rpass-client.test.ts` (create)
- `package.json` test script only, if needed to include the new test.

**Out of scope**:

- Real GPG integration tests.
- Raycast UI tests.
- Adding dependencies.
- Supporting `--passphrase <value>`; this must remain unsupported.

## Git workflow

- Suggested branch: `advisor/002-rpass-client-contract-tests`.
- Commit message if committing: `test(rpass): cover cli contract boundary`.
- Do not push unless instructed.

## Steps

### Step 1: Make the client testable without real `rpass`

Introduce a small internal dependency seam in `src/rpass/application/rpass-client.ts` so tests can control the executable path or spawn behavior. Keep production exports stable: `listEntries`, `showEntry`, `generateOtp`, `version`, `RpassError`, and `OtpResult` must remain available with the same signatures.

Acceptable approaches:

- Export a narrowly scoped test helper to override the executable path during a test, or
- Refactor `run` behind an internal dependency object with a test-only setter/resetter.

Do not add a broad service class unless needed. Ensure tests reset any override in `afterEach`.

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 2: Create a fake CLI test helper

Create `src/rpass/application/rpass-client.test.ts` using `node:test`. The test should create a temporary executable script in `os.tmpdir()` that records argv/stdin and writes configured stdout/stderr. On Windows compatibility matters for the extension, but these tests can use Node to run a temporary `.js` helper via the injected executable or spawn seam.

The fake must allow tests to assert:

- argv contains `--store-dir`, the store path, command name, `--json`, and entry where appropriate.
- passphrase is sent on stdin only when a passphrase is provided.
- argv never contains `--passphrase` followed by the secret value.

**Verify**: run the new test directly, e.g. `npx tsx --test src/rpass/application/rpass-client.test.ts` → exit 0.

### Step 3: Cover successful JSON behavior

Add tests for:

1. `listEntries("/tmp/store")` parses a JSON array from `rpass list --json`.
2. `showEntry("example/login", store, "dummy-passphrase")` calls `show --json --passphrase-stdin example/login`, writes the passphrase to stdin, and formats a response with password first, then fields, optional `otp_uri`, then `extra_lines`.
3. `generateOtp("example/login", store, "dummy-passphrase")` calls `otp --json --passphrase-stdin example/login` and parses `{ name, code, remaining_seconds, period }`.

Use dummy values only: `example/login`, `dummy-password`, `username: demo`, `otpauth://...example.invalid`, and `dummy-passphrase`.

**Verify**: `npx tsx --test src/rpass/application/rpass-client.test.ts` → all new tests pass.

### Step 4: Cover error contract behavior

Add tests for:

1. JSON stderr error shape maps to `RpassError` with the CLI-provided `code` and `message`.
2. Invalid JSON on stdout maps to `RpassError` with code `rpass_invalid_json` for commands that parse JSON.
3. A missing/failing executable maps to `RpassError` with code `rpass_spawn_failed`.
4. A fake CLI that exits non-zero with non-JSON stderr maps to `RpassError` code `rpass_failed` and includes exit details.

**Verify**: `npx tsx --test src/rpass/application/rpass-client.test.ts` → all tests pass.

### Step 5: Add the new test to the npm test script

Update `package.json` so `npm test` includes the new file. Keep the existing two tests included.

**Verify**: `npm test` → all existing and new tests pass.

### Step 6: Run full verification

**Verify**:

- `npx tsc --noEmit` → exit 0.
- `npm test` → exit 0.
- `npm run lint -- --exit-on-error --non-interactive` → exit 0.

## Test plan

The plan itself is primarily a test plan. New tests live in `src/rpass/application/rpass-client.test.ts` and should follow the `node:test` style used by `src/vault/domain/vault-item.test.ts`.

## Done criteria

- [ ] `src/rpass/application/rpass-client.test.ts` exists.
- [ ] Tests verify `show` and `otp` use `--passphrase-stdin` and stdin, not `--passphrase <value>`.
- [ ] Tests cover success and error JSON behavior.
- [ ] `npm test` includes the new test file.
- [ ] `npx tsc --noEmit`, `npm test`, and `npm run lint -- --exit-on-error --non-interactive` exit 0.
- [ ] No files outside the in-scope list are modified.
- [ ] `plans/README.md` status row for plan 002 is updated.

## STOP conditions

Stop and report if:

- Testing requires real GPG, a real password store, or real credentials.
- The only apparent path is to add a third-party test framework.
- Production API signatures would need to change.
- The drift check shows `rpass-client.ts` has already been substantially refactored.

## Maintenance notes

These tests are characterization tests for the CLI boundary. Reviewers should scrutinize any test helper export to ensure it cannot leak into user-visible behavior and that overrides are reset between tests.
