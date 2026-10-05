# Fix round 2: Astra round-2 findings on PRs #2, #3, #4

Same setup as round 1 (`.audit/fix-round1-brief.md`): worktrees `/Users/christian/Developer/raycast-quickadd-wt/pr1-one-run-path` (one-run-path) and `/Users/christian/Developer/raycast-quickadd-wt/pr2` (vault-discovery; session-hardening reachable). Stack `main <- one-run-path <- session-hardening <- vault-discovery`, heads 352c109 / b0a1107 / 379cd1e. Do not touch `wt/pr3`, do not run `ray develop` or any command that installs the extension into Raycast (another agent needs the installed dev build; `pnpm build` is allowed only if you confirm it writes to `dist/` and not to `~/.config/raycast/extensions`; otherwise skip the build gate and say so). Do not stage the untracked `e2e-vault/Projects/Plan.md` and `e2e-vault/Archive/Plan.md` in wt/pr2. pnpm binary: `~/.vite-plus/package_manager/pnpm/10.32.1/pnpm/bin/pnpm`. One commit per fix with a test that fails without it; rebase the stack linear; force-push with lease.

## PR #2 (`one-run-path`)

1. `src/lib/fields.ts` `multiDefault` splits the default on commas, so an option whose value itself contains a comma is never matched. The plugin uses longest-label matching (`splitMultiSelectLabels` in `/Users/christian/Developer/quickadd/src/preflight/runOnePagePreflight.ts`; read it and mirror its rule). Test: options `["a", "b", "a, b"]`, default `"a, b"` -> preselected `["a, b"]`; options `["a", "b"]`, default `"a, b"` -> `["a", "b"]`.

## PR #3 (`session-hardening`)

2. `src/lib/interactive.ts` `replyToPrompt` ignores a non-2xx response. The plugin server answers 400 for a rejected value (for example an input over its size limit) and 409 after the run ended, and the prompt stays unresolved while the driver sits in `working`. Throw on `!res.ok` with the server's `error` text (body is `{ error }` JSON; fall back to the status) so it routes through `fail` -> `end`, which aborts polls and POSTs /abort. Test with the fake server: `/reply` answers 400 `{ error: "too long" }` -> state becomes `failed` with that message, `/abort` is sent once, polling stops.

## PR #4 (`vault-discovery`)

3. `prepareVault` in `src/lib/obsidianCli.ts` still rejects when `ensureVaultReady`'s `open` throws (macOS cannot launch the `obsidian://` handler) or on any other unexpected error, which leaves `VaultGate` in `src/run-choice.tsx` loading forever. Smallest correct fix: `VaultGate` (and Quick Capture's equivalent path) treats a rejection of `prepareVault` like `{ ok:false, message }`, rendering the error view with the error's message. Do not add a per-cause branch. Test: inject an `open` that throws into the readiness deps and assert the gate's result is the failure message (unit-test at whatever layer exposes it cleanly; if only the component does, test `prepareVault`'s wrapper instead and say so).

## Finish

`pnpm lint`, `pnpm test`, `npx tsc --noEmit` green on all three branches; `pnpm e2e:protocol` green from wt/pr2. Report new heads, commits per branch, test tails, anything not done. No em dashes; use "-". `/deslop` before committing.
