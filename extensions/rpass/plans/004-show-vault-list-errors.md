# Plan 004: Show actionable errors when loading the vault list fails

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 1cf4ad9..HEAD -- src/vault/presentation/store.tsx src/rpass/application/rpass-client.ts`
> If in-scope files changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, stop and report.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-restore-lint-baseline.md
- **Category**: bug
- **Planned at**: commit `1cf4ad9`, 2026-06-11

## Why this matters

When `rpass list --json` fails, the vault screen currently catches the error with `console.error` and then stops loading. In Raycast, that can look like an empty vault with no explanation, which is misleading for missing `rpass`, invalid store paths, JSON contract failures, or GPG-related errors. The user should see a failure row/toast and be able to retry.

## Current state

Relevant files:

- `src/vault/presentation/store.tsx` — loads and renders the vault list.
- `src/rpass/application/rpass-client.ts` — defines `RpassError`; import it if needed for formatting.

Current excerpt:

```tsx
// src/vault/presentation/store.tsx:57-67
export default function Store({ storepath }: Props) {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [selectedFolder, setSelectedFolder] = useState(ALL_FOLDERS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadVaultItems(storepath, { listEntries })
      .then(setItems)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [storepath]);
```

Existing error-display pattern:

```tsx
// src/vault/presentation/content.tsx:189-211
if (lastError) {
  return (
    <List isLoading={isLoading}>
      <List.Item
        icon={Icon.ExclamationMark}
        title="Failed to Decrypt Entry"
        subtitle={lastError}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Error" content={lastError} />
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              onAction={() => load(passphrase)}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
```

Repo conventions:

- UI errors should be user-visible via Raycast list items and/or toasts.
- Keep presentation logic in `src/vault/presentation/*`.

## Commands you will need

| Purpose   | Command                                             | Expected on success   |
| --------- | --------------------------------------------------- | --------------------- |
| Typecheck | `npx tsc --noEmit`                                  | exit 0                |
| Tests     | `npm test`                                          | exit 0                |
| Lint      | `npm run lint -- --exit-on-error --non-interactive` | exit 0 after plan 001 |

## Scope

**In scope**:

- `src/vault/presentation/store.tsx`
- `src/rpass/application/rpass-client.ts` only for importing/using `RpassError` type; do not change client behavior in this plan.

**Out of scope**:

- Changing `loadVaultItems` behavior.
- Adding UI test tooling.
- Changing install-check behavior; that is plan 005.

## Git workflow

- Suggested branch: `advisor/004-show-vault-list-errors`.
- Commit message if committing: `fix(vault): show list loading errors`.
- Do not push unless instructed.

## Steps

### Step 1: Add explicit error state and a reload function

In `Store`, add state for a displayable error string, e.g. `const [lastError, setLastError] = useState<string>();`.

Replace the inline `useEffect` promise chain with a named async `load()` function or `useCallback` that:

1. sets loading true,
2. clears the previous error,
3. calls `loadVaultItems(storepath, { listEntries })`,
4. updates `items` on success,
5. formats and stores an error message on failure,
6. sets loading false in `finally`.

For formatting, match `content.tsx`: if the error is `RpassError`, include `code`, `message`, and optional `details`; otherwise use normal `Error.message` or `String(error)`.

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 2: Render a failure row with retry and copy actions

If `lastError` is set, render a `<List isLoading={isLoading}>` with one `<List.Item>` similar to `Content`'s error row:

- icon: `Icon.ExclamationMark`
- title: `Failed to Load Vault`
- subtitle: the formatted error
- actions:
  - `Action.CopyToClipboard` title `Copy Error`
  - `Action` title `Retry`, icon `Icon.ArrowClockwise`, calls `load()`

Do not leave `.catch(console.error)` in the code path.

**Verify**: `grep -RIn "catch(console.error)" src/vault/presentation/store.tsx` → no matches.

### Step 3: Keep normal list behavior unchanged

Ensure the existing folder filter, `filteredItems.map`, and `Action.Push` to `Content` remain semantically unchanged.

**Verify**: `git diff -- src/vault/presentation/store.tsx` → diff is limited to error handling/loading state and any formatting caused by Prettier.

### Step 4: Run full verification

**Verify**:

- `npx tsc --noEmit` → exit 0.
- `npm test` → exit 0.
- `npm run lint -- --exit-on-error --non-interactive` → exit 0.

## Test plan

No automated UI tests exist in this repo. This plan relies on typecheck/lint and manual Raycast verification:

- Configure an invalid `rpassExecutablePath` or invalid store path.
- Open the Vault command.
- Expected: the list shows `Failed to Load Vault` with Copy Error and Retry actions.
- Restore valid preferences and confirm the vault list loads normally.

## Done criteria

- [ ] `Store` no longer uses `.catch(console.error)` for list loading.
- [ ] A load failure renders `Failed to Load Vault` with Copy Error and Retry actions.
- [ ] Normal list rendering remains unchanged when loading succeeds.
- [ ] `npx tsc --noEmit`, `npm test`, and `npm run lint -- --exit-on-error --non-interactive` exit 0.
- [ ] No files outside the in-scope list are modified.
- [ ] `plans/README.md` status row for plan 004 is updated.

## STOP conditions

Stop and report if:

- Raycast API types do not allow the proposed actions in a list error row.
- The codebase has introduced a shared error component since this plan was written; use it only after confirming it matches the existing `Content` behavior.
- Fixing this requires changing `rpass-client` behavior.

## Maintenance notes

This plan intentionally keeps errors local to the vault-list screen. If the app later gains a shared error component, both `Store` and `Content` should be consolidated in a separate refactor.
