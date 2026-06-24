# Plan 006: Prevent copying or pasting placeholder TOTP codes

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 1cf4ad9..HEAD -- src/vault/presentation/otp-row.tsx`
> If the in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, stop and report.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-restore-lint-baseline.md
- **Category**: bug
- **Planned at**: commit `1cf4ad9`, 2026-06-11

## Why this matters

The TOTP row displays `------` while no code has been loaded. The Copy and Paste actions always use the displayed `code`, so a user can accidentally copy or paste `------` into a real login form if OTP generation is still loading or failed. The row should keep refresh available but disable or hide copy/paste until a real OTP exists.

## Current state

Relevant file:

- `src/vault/presentation/otp-row.tsx` — TOTP display and actions.

Current excerpts:

```tsx
// src/vault/presentation/otp-row.tsx:92-95
const code = result?.code ?? "------";
const period = result?.period ?? 30;
const color = urgencyColor(remaining, period);
const progress = countdownProgress(remaining, period);
```

```tsx
// src/vault/presentation/otp-row.tsx:109-123
actions={
  <ActionPanel>
    <Action
      title="Copy TOTP to Clipboard"
      onAction={() => copyPassword(code)}
    />
    <Action
      title="Paste TOTP in Active App"
      onAction={() => pastePassword(code)}
    />
    <Action
      title="Refresh TOTP"
      icon={Icon.RotateClockwise}
      onAction={fetchOtp}
    />
  </ActionPanel>
}
```

Repo conventions:

- Copy/paste helpers live in `src/vault/presentation/clipboard.ts` and accept strings.
- UI components should avoid exposing invalid secrets/codes to the clipboard.

## Commands you will need

| Purpose   | Command                                             | Expected on success   |
| --------- | --------------------------------------------------- | --------------------- |
| Typecheck | `npx tsc --noEmit`                                  | exit 0                |
| Tests     | `npm test`                                          | exit 0                |
| Lint      | `npm run lint -- --exit-on-error --non-interactive` | exit 0 after plan 001 |

## Scope

**In scope**:

- `src/vault/presentation/otp-row.tsx`

**Out of scope**:

- Changing OTP generation in `rpass-client.ts`.
- Changing countdown/refresh timing.
- Adding a full UI test framework.

## Git workflow

- Suggested branch: `advisor/006-disable-placeholder-totp-actions`.
- Commit message if committing: `fix(vault): disable placeholder totp actions`.
- Do not push unless instructed.

## Steps

### Step 1: Separate display text from actionable code

In `OtpRow`, introduce a variable that is only set when `result?.code` exists, for example:

```ts
const totpCode = result?.code;
const displayCode = totpCode ?? "------";
```

Use `displayCode` for accessories and progress display. Use `totpCode` for copy/paste availability.

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 2: Hide or disable copy/paste actions until a code exists

Update the `ActionPanel` so Copy and Paste are only rendered when `totpCode` is truthy. Keep `Refresh TOTP` always available.

Preferred shape:

```tsx
{totpCode ? (
  <>
    <Action title="Copy TOTP to Clipboard" onAction={() => copyPassword(totpCode)} />
    <Action title="Paste TOTP in Active App" onAction={() => pastePassword(totpCode)} />
  </>
) : null}
<Action title="Refresh TOTP" ... />
```

Do not call `copyPassword(displayCode)` or `pastePassword(displayCode)`.

**Verify**: `grep -n "copyPassword(code)\|pastePassword(code)\|------" src/vault/presentation/otp-row.tsx` → no `copyPassword(code)` or `pastePassword(code)` matches; `------` may remain only as display fallback.

### Step 3: Run full verification

**Verify**:

- `npx tsc --noEmit` → exit 0.
- `npm test` → exit 0.
- `npm run lint -- --exit-on-error --non-interactive` → exit 0.

## Test plan

No automated UI tests exist. Manual Raycast check:

- Open an entry with TOTP.
- Before the first OTP response, only Refresh should be actionable; Copy/Paste should not copy `------`.
- After OTP loads, Copy and Paste actions should appear/use the real code.
- If OTP generation fails, Refresh remains available and Copy/Paste remain unavailable.

## Done criteria

- [ ] Copy/Paste actions cannot use the placeholder `------`.
- [ ] Refresh TOTP remains available regardless of load state.
- [ ] TOTP display still shows a loading fallback while no code exists.
- [ ] `npx tsc --noEmit`, `npm test`, and `npm run lint -- --exit-on-error --non-interactive` exit 0.
- [ ] No files outside `src/vault/presentation/otp-row.tsx` are modified.
- [ ] `plans/README.md` status row for plan 006 is updated.

## STOP conditions

Stop and report if:

- Raycast requires at least one non-refresh action for the row to work.
- The live component has already been refactored to a different action model.
- The fix appears to require changing clipboard helpers.

## Maintenance notes

If a future UI adds disabled action support, it may be better to show disabled copy/paste actions with explanatory titles. For now, hiding unavailable actions is the smallest safe behavior change.
