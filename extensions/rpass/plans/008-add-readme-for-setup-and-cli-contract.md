# Plan 008: Add a README for setup, usage, and the rpass CLI contract

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 1cf4ad9..HEAD -- README.md package.json AGENTS.md`
> If any in-scope file changed since this plan was written, compare the "Current state" facts against the live repo before proceeding; on a mismatch, stop and report.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-restore-lint-baseline.md
- **Category**: docs
- **Planned at**: commit `1cf4ad9`, 2026-06-11

## Why this matters

The repository has no visible `README.md`, yet the extension depends on an external `rpass` binary, a password-store directory, Raycast preferences, and a strict CLI contract. New contributors and users currently need to infer setup from `package.json` and `AGENTS.md`. A short README reduces onboarding friction and prevents unsafe passphrase patterns from reappearing.

## Current state

Relevant files:

- `README.md` — absent at audit time.
- `package.json` — contains extension metadata, preferences, and scripts.
- `AGENTS.md` — contains the authoritative updated `rpass` CLI contract and safety rules.

Current facts from `package.json`:

```json
"description": "Manage your pass-compatible password store with rpass. Cross-platform GPG encryption and TTOTP support.",
"commands": [
  {
    "mode": "view",
    "name": "vault",
    "title": "Vault",
    "description": "Browse, decrypt, and copy passwords from your pass-compatible vault.",
    "subtitle": "rPass"
  }
]
```

Relevant `AGENTS.md` contract summary to include without copying the whole file:

- `rpass` preserves password-store format: `<entry-name>.gpg`, password first line, metadata as plain text lines.
- Integrations must use `--passphrase-stdin`, not `--passphrase <value>`.
- `show --json` and `otp --json` success returns one complete JSON value on stdout; failure returns a JSON error object on stderr.
- Entries are addressed without `.gpg` suffix.

Repo scripts:

```json
"dev": "ray develop",
"lint": "ray lint",
"test": "tsx --test src/vault/domain/vault-item.test.ts src/vault/application/filter-vault-items.test.ts",
"build": "ray build"
```

Repo conventions:

- Dummy examples only: `example/login`, `demo/account`, `example.invalid`, `dummy-password`.
- Avoid real domains, personal names, or real-looking credentials in docs.

## Commands you will need

| Purpose   | Command                                             | Expected on success   |
| --------- | --------------------------------------------------- | --------------------- |
| Typecheck | `npx tsc --noEmit`                                  | exit 0                |
| Tests     | `npm test`                                          | exit 0                |
| Lint      | `npm run lint -- --exit-on-error --non-interactive` | exit 0 after plan 001 |

## Scope

**In scope**:

- `README.md` (create)
- `package.json` only if a typo in the package description is corrected; avoid unrelated manifest changes.

**Out of scope**:

- Changing extension behavior.
- Publishing instructions beyond existing `npm run publish`.
- Documenting incomplete future commands (`generate`, `rm`, `mv`) as available in the extension.

## Git workflow

- Suggested branch: `advisor/008-add-readme`.
- Commit message if committing: `docs(readme): add setup and cli contract`.
- Do not push unless instructed.

## Steps

### Step 1: Create a concise README

Create `README.md` with these sections:

1. `# RPass Raycast Extension`
2. What it does: browse a pass-compatible store, decrypt entries via `rpass`, copy/paste passwords and metadata, show TOTP when present.
3. Requirements: Raycast, Node/npm for development, installed `rpass` CLI, configured GPG/password store.
4. Setup: `npm install`, Raycast development command `npm run dev`, preferences for `rpassExecutablePath`, `passwordStoreDir`, `defaultAction`, `clipboardTimeout`.
5. CLI contract for integration: JSON stdout/stderr, `--passphrase-stdin`, no `--passphrase <value>`, entries without `.gpg` suffix.
6. Development verification commands: `npx tsc --noEmit`, `npm test`, `npm run lint -- --exit-on-error --non-interactive`, `npm run build` if desired.
7. Safety note: do not put real credentials in tests/docs/issues.

Use only dummy examples from `AGENTS.md`.

**Verify**: `test -s README.md && grep -n "--passphrase-stdin\|npm test\|example/login" README.md` → shows matches.

### Step 2: Correct obvious public typo if still present

If `package.json` still says `TTOTP support`, correct it to `TOTP support`. Do not make broader copy changes.

**Verify**: `grep -n "TTOTP" package.json README.md || true` → no matches.

### Step 3: Run verification

Docs-only changes should not break code.

**Verify**:

- `npx tsc --noEmit` → exit 0.
- `npm test` → exit 0.
- `npm run lint -- --exit-on-error --non-interactive` → exit 0.

## Test plan

No new automated tests are required. The README is verified by grep checks and the normal repo gates.

## Done criteria

- [ ] `README.md` exists and includes setup, preferences, CLI contract, verification commands, and safety notes.
- [ ] README examples use dummy entries/domains only.
- [ ] README explicitly says integrations use `--passphrase-stdin`, not `--passphrase <value>`.
- [ ] `TTOTP` typo is absent if it existed.
- [ ] `npx tsc --noEmit`, `npm test`, and `npm run lint -- --exit-on-error --non-interactive` exit 0.
- [ ] No source files are modified.
- [ ] `plans/README.md` status row for plan 008 is updated.

## STOP conditions

Stop and report if:

- A README already exists and conflicts with this plan's assumptions.
- The user wants public release/publishing docs that require policy decisions not present in the repo.
- You find real credentials or personal data in existing docs; do not copy them — report file and credential type only.

## Maintenance notes

Update the README when future extension commands are added for `generate`, `rm`, `mv`, git integration, or recipients. Keep CLI contract details aligned with `AGENTS.md`.
