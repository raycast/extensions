# Plan 012: Reuse GPG agent unlock state before prompting again

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat cf03eb3..HEAD -- src/rpass/application/rpass-client.ts src/vault/presentation/content.tsx src/vault/presentation/edit-entry.tsx src/vault/presentation/otp-row.tsx src/vault/presentation/gpg-timeout-help.tsx src/vault/application src/vault/presentation`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: correctness / UX / tech-debt
- **Planned at**: commit `cf03eb3`, 2026-06-13

## Why this matters

The extension now avoids pinentry hangs by asking for a GPG passphrase before decrypting and then using `rpass --passphrase-stdin`. That fixed the timeout path, but it regressed UX: every Show/Edit/TOTP flow asks again even after GPG agent has already been unlocked by a successful decrypt. GPG already owns passphrase caching, so the extension should not persist passphrases at rest; instead it should remember only that a store had a successful unlock in this Raycast session and optimistically try a no-passphrase decrypt before showing the passphrase form again.

This keeps the safe integration path (`--passphrase-stdin`) for first unlocks while restoring the normal pass-compatible behavior after GPG agent is warm.

## Current state

Relevant files:

- `src/rpass/application/rpass-client.ts` — CLI boundary; already uses `--passphrase-stdin` only when a passphrase is provided.
- `src/vault/presentation/content.tsx` — Show Entry UI; currently starts in passphrase-required mode.
- `src/vault/presentation/edit-entry.tsx` — Edit Entry UI; currently asks for a passphrase when none is passed from Content.
- `src/vault/presentation/otp-row.tsx` — TOTP row; uses the passphrase passed by Content.
- `src/vault/presentation/gpg-timeout-help.tsx` — timeout/pinentry error classification.

Current excerpts:

```ts
// src/rpass/application/rpass-client.ts:216-228
export async function showEntryContent(
  entry: string,
  storeDir: string,
  passphrase?: string,
): Promise<ShowEntryJson> {
  const args = ["--store-dir", storeDir, "show", "--json"];
  if (passphrase !== undefined) args.push("--passphrase-stdin");
  args.push(entry);

  const stdout = await run(args, passphrase, {
    timeoutMs: passphrase !== undefined ? 60000 : 10000,
  });
  return parseJson<ShowEntryJson>(stdout);
}
```

```tsx
// src/vault/presentation/content.tsx:117-135
export default function Content({ storepath, entry }: Props) {
  const { defaultAction } = getPreferenceValues<Preferences>();
  const [rows, setRows] = useState<VaultEntryRow[]>([]);
  const [passphrase, setPassphrase] = useState<string>();
  const [needsPassphrase, setNeedsPassphrase] = useState(true);
  const [passphraseInput, setPassphraseInput] = useState("");
  const [passphraseError, setPassphraseError] = useState<string>();
  const [passphraseVisible, setPassphraseVisible] = useState(false);
  const [lastError, setLastError] = useState<string>();
  const [lastErrorHasGpgHelp, setLastErrorHasGpgHelp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function load(passphrase?: string) {
    setIsLoading(true);
    try {
      const content = await showEntry(entry, storepath, passphrase);
      setRows(parseVaultEntryRows(content));
      setPassphrase(passphrase);
```

```tsx
// src/vault/presentation/edit-entry.tsx:149-154
const [isLoading, setIsLoading] = useState(passphrase !== undefined);
const [needsPassphrase, setNeedsPassphrase] = useState(
  passphrase === undefined,
);
const [unlockPassphrase, setUnlockPassphrase] = useState<string>();
```

```tsx
// src/vault/presentation/edit-entry.tsx:180-198
useEffect(() => {
  if (passphrase === undefined && unlockPassphrase === undefined) {
    setNeedsPassphrase(true);
    setIsLoading(false);
    return;
  }

  let cancelled = false;

  async function load() {
    setIsLoading(true);
    setLastError(undefined);
    setLastErrorHasGpgHelp(false);
    try {
      const content = await showEntryContent(
        entry,
        storepath,
        unlockPassphrase ?? passphrase,
```

Repo conventions to match:

- Business rules and use-case orchestration belong in plain TypeScript under `src/vault/application` or `src/rpass/application`; presentation components should stay mostly UI and Raycast side effects.
- Existing tests use Node's built-in test runner (`node:test`) and `assert/strict`; model pure/application tests after `src/vault/application/filter-vault-items.test.ts` and CLI boundary tests after `src/rpass/application/rpass-client.test.ts`.
- Pass dependencies explicitly where practical. Do not put new generic helpers in `src/lib`.
- Never pass a GPG passphrase through CLI args. Keep using stdin + `--passphrase-stdin`.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Typecheck | `npx tsc --noEmit` | exit 0, no TypeScript errors |
| Unit tests | `npm test` | exit 0, all tests pass |
| Lint | `npm run lint -- --exit-on-error --non-interactive` | exit 0 |
| Full gate | `npx tsc --noEmit && npm test && npm run lint -- --exit-on-error --non-interactive` | exit 0 |

## Scope

**In scope**:

- `src/rpass/application/rpass-client.ts`
- `src/rpass/application/rpass-client.test.ts`
- New `src/vault/application/gpg-unlock-session.ts`
- New `src/vault/application/gpg-unlock-session.test.ts`
- `src/vault/presentation/content.tsx`
- `src/vault/presentation/edit-entry.tsx`
- `src/vault/presentation/otp-row.tsx` only if needed to pass through the selected unlock state
- `src/vault/presentation/gpg-timeout-help.tsx` only if error classification needs a small helper

**Out of scope**:

- Persisting passphrases to disk, Raycast LocalStorage, preferences, Keychain, or logs.
- Adding a long-lived passphrase cache. The cache should store only unlock state, not the secret.
- Changing `rpass` CLI behavior.
- Reintroducing decrypt-on-vault-list; `Vault` must continue to use only `rpass list --json` for the list.
- Adding TanStack Query, Router, or broad architecture migrations.
- Refactoring New Entry, Sync Vault, Git, or setup flows unless a compile error forces a tiny import/type update.

## Git workflow

- Suggested branch: `fix/reuse-gpg-unlock-state`.
- Commit message style: conventional commits, e.g. `fix(vault): reuse gpg agent unlock state`.
- Do not push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add a small application-level unlock session policy

Create `src/vault/application/gpg-unlock-session.ts`. Keep it framework-free. It should model unlock state without storing passphrases.

Required behavior:

- Track stores that had at least one successful passphrase-based unlock in the current extension process.
- Expose intention-revealing functions, for example:
  - `markStoreUnlocked(storeDir: string): void`
  - `forgetStoreUnlock(storeDir: string): void`
  - `shouldTryAgentUnlock(storeDir: string): boolean`
- Normalize only enough to avoid obvious duplicate keys for the same store string if there is an existing helper; do not introduce path-resolution complexity.
- Store only booleans/timestamps, never the passphrase.

Add `src/vault/application/gpg-unlock-session.test.ts` covering:

- initial state returns false;
- after `markStoreUnlocked`, `shouldTryAgentUnlock` returns true;
- after `forgetStoreUnlock`, it returns false;
- no API accepts or returns a passphrase.

**Verify**: `npm test` → exits 0 and includes the new unlock-session tests. If `package.json` test script lists tests explicitly, add the new test file to that script.

### Step 2: Let the rpass client support a short optimistic agent timeout

In `src/rpass/application/rpass-client.ts`, introduce named timeout constants near the CLI runner, for example:

```ts
const DEFAULT_RPASS_TIMEOUT_MS = 10000;
const UNLOCK_WITH_PASSPHRASE_TIMEOUT_MS = 60000;
const OPTIMISTIC_AGENT_UNLOCK_TIMEOUT_MS = 3000;
```

Add an optional parameter to `showEntryContent` and `showEntry` so callers can request the shorter timeout only when trying a no-passphrase agent unlock. Keep existing callers unchanged by default.

One acceptable shape:

```ts
interface DecryptOptions {
  passphrase?: string;
  timeoutMs?: number;
}

showEntryContent(entry, storeDir, options?: DecryptOptions)
showEntry(entry, storeDir, options?: DecryptOptions)
```

If changing the signature is too invasive, add a separate wrapper such as `showEntryContentWithTimeout(entry, storeDir, timeoutMs)`. Prefer the options object if it keeps call sites readable.

Update `src/rpass/application/rpass-client.test.ts` to preserve these contracts:

- passphrase path still appends `--passphrase-stdin` and writes the passphrase to stdin;
- no-passphrase optimistic path does not append `--passphrase-stdin` and writes empty stdin;
- no test should assert a passphrase appears in args.

**Verify**: `npm test -- src/rpass/application/rpass-client.test.ts` if supported by the runner, otherwise `npm test` → exits 0.

### Step 3: Update Show Entry to try GPG agent only after a known successful unlock

In `src/vault/presentation/content.tsx`, keep the component focused on UI and delegate the policy to `gpg-unlock-session.ts`.

Required behavior:

1. If `shouldTryAgentUnlock(storepath)` is false, keep the current safe behavior: show the passphrase form first.
2. If `shouldTryAgentUnlock(storepath)` is true, start loading immediately with no passphrase and the short optimistic timeout.
3. If the optimistic load succeeds, render the entry and do not prompt.
4. If it fails with `gpg_passphrase_required`, `rpass_timeout`, or another GPG/pinentry error, call `forgetStoreUnlock(storepath)` and show the passphrase form.
5. If the user submits a passphrase and the load succeeds, call `markStoreUnlocked(storepath)`.
6. Continue passing the submitted passphrase down to `OtpRow` while it is available in this `Content` instance; if the agent-only path succeeded, `OtpRow` may call `generateOtp` without a passphrase and should rely on GPG agent.

Use intention-revealing function names inside the component, such as `loadWithSubmittedPassphrase`, `tryLoadWithAgent`, and `showUnlockFormForError`. Avoid one long `load` function with nested conditionals.

**Verify**: `npx tsc --noEmit` → exits 0.

### Step 4: Update Edit Entry with the same unlock policy

In `src/vault/presentation/edit-entry.tsx`, apply the same rules:

- If a `passphrase` prop exists, use it exactly as today.
- Else if `shouldTryAgentUnlock(storepath)` is true, attempt `showEntryContent` with no passphrase and the short optimistic timeout.
- If that succeeds, do not show the passphrase form.
- If it fails with passphrase-required/timeout/pinentry, forget the unlock state and show the passphrase form.
- If the user submits a passphrase and load succeeds, mark the store unlocked.

Do not move entry validation, generation option inference, or write/save behavior into the unlock module. Those remain local or should later move to separate application functions in another plan.

**Verify**: `npx tsc --noEmit` → exits 0.

### Step 5: Add minimal regression coverage for the policy and CLI boundary

Because the repo currently has no React component test harness, do not add brittle UI tests in this plan. Instead:

- Ensure `gpg-unlock-session.test.ts` covers policy transitions.
- Ensure `rpass-client.test.ts` covers the new decrypt options/signature and preserves stdin behavior.
- If you extract any pure error policy (for example `shouldPromptForPassphraseAfterDecryptError(error)`), add a pure test for it.

**Verify**: `npm test` → exits 0 and includes all existing plus new tests.

### Step 6: Run the full verification gate

Run:

```bash
npx tsc --noEmit && npm test && npm run lint -- --exit-on-error --non-interactive
```

Expected result: exit 0. `npm test` should report more than the current 31 tests because this plan adds at least one new test file.

## Test plan

Add or update tests as follows:

- `src/vault/application/gpg-unlock-session.test.ts`
  - starts locked;
  - marks store unlocked;
  - forgets store unlock;
  - does not expose passphrases in the API.
- `src/rpass/application/rpass-client.test.ts`
  - existing passphrase stdin test still passes;
  - new no-passphrase/agent attempt test verifies args do not contain `--passphrase-stdin` and stdin is empty;
  - if timeout options become externally testable, verify that the options are accepted without changing stdout parsing.

No source behavior is done until the full command below passes:

```bash
npx tsc --noEmit && npm test && npm run lint -- --exit-on-error --non-interactive
```

## Done criteria

- [ ] Show Entry does not prompt first when this process has already seen a successful unlock for the same store.
- [ ] Edit Entry follows the same reuse behavior.
- [ ] First unlock still uses `--passphrase-stdin`; passphrases never appear in CLI args, errors, logs, LocalStorage, or preferences.
- [ ] Failed optimistic agent attempts fall back to the passphrase form and clear the optimistic unlock marker.
- [ ] `Vault` still lists with `rpass list --json` only; no decrypt-mass behavior is introduced.
- [ ] New pure/application tests exist and pass.
- [ ] `npx tsc --noEmit`, `npm test`, and `npm run lint -- --exit-on-error --non-interactive` all exit 0.
- [ ] `plans/README.md` status row for plan 012 is updated.

## STOP conditions

Stop and report back if:

- Raycast command process isolation means module-level state cannot be reused even within the Show/Edit navigation flow; report observed behavior and do not switch to persistent passphrase storage.
- The implementation appears to require storing a passphrase outside component memory.
- Avoiding the prompt would require decrypting every vault entry while listing.
- Existing `showEntryContent` call sites become confusing after the signature change; stop and propose a smaller wrapper instead of touching many unrelated files.
- The full verification gate fails twice after reasonable fixes.

## Maintenance notes

This plan intentionally relies on GPG agent for real passphrase caching. The extension only records an ephemeral "agent likely unlocked" hint. If future work adds a true secure passphrase cache, it must be a separate security-reviewed plan with explicit storage, expiration, and clearing semantics.

Reviewers should scrutinize that no passphrase is persisted and that the optimistic no-passphrase path is only enabled after a successful explicit unlock. The short timeout is important: it prevents returning to the original UX problem where a no-passphrase decrypt can hang behind pinentry.
