# Plan 005: Move rpass install checks out of React render

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 1cf4ad9..HEAD -- src/vault.tsx src/vault/presentation/check-install.ts`
> If in-scope files changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, stop and report.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-restore-lint-baseline.md
- **Category**: bug
- **Planned at**: commit `1cf4ad9`, 2026-06-11

## Why this matters

`checkInstall()` spawns `rpass --version` and may show a toast. It is currently called directly inside the React command component body, which is render-time side effect. React can re-render components for reasons unrelated to command startup, causing repeated process spawns or duplicate toasts. The install check should run from an effect.

## Current state

Relevant files:

- `src/vault.tsx` — Raycast command entrypoint; currently calls `checkInstall()` during render.
- `src/vault/presentation/check-install.ts` — async helper that calls `version()` and shows install toast on failure.

Current excerpts:

```tsx
// src/vault.tsx:1-5
import { homedir } from "node:os";
import { join } from "node:path";
import { getPreferenceValues } from "@raycast/api";
import checkInstall from "./vault/presentation/check-install";
import Store from "./vault/presentation/store";
```

```tsx
// src/vault.tsx:11-18
export default function Command() {
  const { passwordStoreDir } = getPreferenceValues<Preferences>();
  const storepath =
    passwordStoreDir?.trim() || join(homedir(), ".password-store");

  checkInstall();

  return <Store storepath={storepath} />;
}
```

```ts
// src/vault/presentation/check-install.ts:22-28
export default async function checkInstall(): Promise<void> {
  try {
    await version();
  } catch {
    showToast(notInstalledToast());
  }
}
```

Repo conventions:

- Presentation side effects elsewhere use `useEffect`, e.g. `Store` loads items in `src/vault/presentation/store.tsx`.
- Keep the command entrypoint small.

## Commands you will need

| Purpose   | Command                                             | Expected on success   |
| --------- | --------------------------------------------------- | --------------------- |
| Typecheck | `npx tsc --noEmit`                                  | exit 0                |
| Tests     | `npm test`                                          | exit 0                |
| Lint      | `npm run lint -- --exit-on-error --non-interactive` | exit 0 after plan 001 |

## Scope

**In scope**:

- `src/vault.tsx`
- `src/vault/presentation/check-install.ts` only if a small helper change is needed.

**Out of scope**:

- Changing the install toast text/actions.
- Changing `rpass-client.version()`.
- Adding new dependencies.

## Git workflow

- Suggested branch: `advisor/005-install-check-effect`.
- Commit message if committing: `fix(vault): run install check in effect`.
- Do not push unless instructed.

## Steps

### Step 1: Import `useEffect` in the command entrypoint

In `src/vault.tsx`, import `useEffect` from React.

**Verify**: `npx tsc --noEmit` → exit 0 after the next step; this intermediate step may be unused until step 2.

### Step 2: Run `checkInstall` from an effect

Replace the direct `checkInstall();` call with:

```tsx
useEffect(() => {
  checkInstall();
}, []);
```

If lint complains about the floating promise, wrap it in `void checkInstall();`.

Do not include `storepath` in the dependency list unless the install check actually depends on the store path. It checks only the executable version.

**Verify**: `grep -n "checkInstall();" src/vault.tsx` → either no direct bare render call remains, or the only match is inside the `useEffect` body.

### Step 3: Run full verification

**Verify**:

- `npx tsc --noEmit` → exit 0.
- `npm test` → exit 0.
- `npm run lint -- --exit-on-error --non-interactive` → exit 0.

## Test plan

No automated UI tests exist. Manual Raycast check:

- Open the Vault command with a valid `rpass` executable.
- Expected: no install failure toast.
- Configure an invalid `rpassExecutablePath`.
- Open the Vault command.
- Expected: one install failure toast, not repeated on passive re-renders.

## Done criteria

- [ ] `checkInstall()` is not called directly as a render-time side effect.
- [ ] The install check still runs when the command mounts.
- [ ] `npx tsc --noEmit`, `npm test`, and `npm run lint -- --exit-on-error --non-interactive` exit 0.
- [ ] No files outside the in-scope list are modified.
- [ ] `plans/README.md` status row for plan 005 is updated.

## STOP conditions

Stop and report if:

- React hooks are unavailable in this command environment.
- Moving the call causes Raycast to skip the install toast entirely.
- Fixing lint requires changing the install helper's public behavior.

## Maintenance notes

If future checks depend on preferences such as `rpassExecutablePath`, consider a small `useCheckInstall` hook. Do not introduce that abstraction for this one-line effect move unless it becomes necessary.
