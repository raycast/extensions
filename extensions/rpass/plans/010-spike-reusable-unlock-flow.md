# Plan 010: Spike a reusable passphrase unlock flow

> **Executor instructions**: This is a design/spike plan. Do not refactor production source in this plan. Create a design note only, then update `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 1cf4ad9..HEAD -- src/vault/presentation/content.tsx src/vault/presentation/otp-row.tsx src/rpass/application/rpass-client.ts`
> If unlock-related code changed, compare this plan against the live code before proceeding; on a mismatch, stop and report.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/002-add-rpass-client-contract-tests.md; plans/005-move-install-check-out-of-render.md
- **Category**: direction
- **Planned at**: commit `1cf4ad9`, 2026-06-11

## Why this matters

The current extension has one passphrase form in `Content` and passes the unlocked passphrase down to `OtpRow`. If the extension adds write flows or more commands that require GPG, duplicating this logic will increase security and UX risk. A spike should define whether a small hook/component is warranted and what it must not do, especially around not exposing passphrases as CLI args.

## Current state

Relevant files:

- `src/vault/presentation/content.tsx` — owns passphrase UI and `passphrase` state.
- `src/vault/presentation/otp-row.tsx` — receives optional `passphrase` prop and calls `generateOtp`.
- `src/rpass/application/rpass-client.ts` — uses `--passphrase-stdin` when a passphrase is provided.

Current excerpts:

```tsx
// src/vault/presentation/content.tsx:107-115
const [passphrase, setPassphrase] = useState<string>();
const [needsPassphrase, setNeedsPassphrase] = useState(false);
const [passphraseInput, setPassphraseInput] = useState("");
const [passphraseError, setPassphraseError] = useState<string>();
const [passphraseVisible, setPassphraseVisible] = useState(false);
const [lastError, setLastError] = useState<string>();
const [isLoading, setIsLoading] = useState(true);

async function load(passphrase?: string) {
```

```ts
// src/rpass/application/rpass-client.ts:141-145
const args = ["--store-dir", storeDir, "show", "--json"];
if (passphrase !== undefined) args.push("--passphrase-stdin");
args.push(entry);

const stdout = await run(args, passphrase);
```

## Commands you will need

| Purpose             | Command                                                                  | Expected on success            |
| ------------------- | ------------------------------------------------------------------------ | ------------------------------ |
| Inspect unlock code | `grep -RIn "passphrase" src/vault src/rpass/application/rpass-client.ts` | shows current passphrase sites |
| Tests               | `npm test`                                                               | exit 0                         |

## Scope

**In scope**:

- Create `plans/spikes/reusable-unlock-flow.md`.
- Read-only investigation of current passphrase-related source.

**Out of scope**:

- Refactoring `Content` or `OtpRow`.
- Persisting passphrases outside React memory.
- Adding keychain/session storage.

## Git workflow

- Suggested branch: `advisor/010-spike-unlock-flow`.
- Commit message if committing: `docs(plans): design reusable unlock flow`.

## Steps

### Step 1: Inventory current unlock responsibilities

Document which responsibilities live in `Content`: detecting `gpg_passphrase_required`, rendering the form, validating input, toggling visibility, retrying load, storing passphrase in state, and passing it to `OtpRow`.

**Verify**: `grep -n "gpg_passphrase_required\|passphraseVisible\|setPassphrase" src/vault/presentation/content.tsx` → shows the current code paths.

### Step 2: Define a minimal future abstraction

In the spike note, propose one minimal abstraction shape, such as `usePassphraseUnlock({ load })` or a `PassphraseUnlockForm` component. Include:

- exact state it owns,
- exact state it must not own,
- how callers retry after unlock,
- how it avoids passing passphrases through command-line args,
- how it should be tested.

Do not require this abstraction until there are at least two production callers.

**Verify**: `grep -n "usePassphraseUnlock\|PassphraseUnlockForm\|must not" plans/spikes/reusable-unlock-flow.md` → shows the design.

### Step 3: Recommend when to implement

End the spike with a clear recommendation: implement only when adding the first write flow or another GPG-protected command, unless `Content` grows substantially first.

**Verify**: `grep -n "Recommendation" plans/spikes/reusable-unlock-flow.md` → exists.

## Test plan

No source tests are required for the spike. The design note must list future tests, including passphrase-required, invalid passphrase, successful retry, and no CLI arg leakage.

## Done criteria

- [ ] `plans/spikes/reusable-unlock-flow.md` exists.
- [ ] It documents current responsibilities and a minimal future abstraction.
- [ ] It explicitly says not to persist passphrases and not to use `--passphrase <value>`.
- [ ] It recommends when to implement vs. when not to.
- [ ] Source files are unchanged.
- [ ] `plans/README.md` status row for plan 010 is updated.

## STOP conditions

Stop and report if:

- Current code has already introduced a shared unlock abstraction.
- The design would require storing passphrases outside ephemeral component state.

## Maintenance notes

This spike exists to prevent premature abstraction. If a future implementation plan uses it, copy the design constraints into that implementation plan so the executor has full context.
