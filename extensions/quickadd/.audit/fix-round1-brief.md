# Fix round 1: Astra review findings on PRs #2, #3, #4

Worktrees you own: `/Users/christian/Developer/raycast-quickadd-wt/pr1-one-run-path` (branch `one-run-path`) and `/Users/christian/Developer/raycast-quickadd-wt/pr2` (branch `vault-discovery`; `session-hardening` is also reachable there). Both are idle. Another agent is building `link-completion` in `/Users/christian/Developer/raycast-quickadd-wt/pr3` on top of the current `vault-discovery`; do not touch that worktree. Do not run `ray develop`. Do not modify files under `e2e-vault/` (Obsidian has the pr2 copy open) unless a fix needs a fixture, in which case say so. pnpm binary: `~/.vite-plus/package_manager/pnpm/10.32.1/pnpm/bin/pnpm`.

Stack: `main` <- `one-run-path` (PR #2) <- `session-hardening` (PR #3) <- `vault-discovery` (PR #4). Fix each finding on the branch that introduced it, then rebase the branches above it so the stack stays linear, and force-push all three with `--force-with-lease`. Each fix is its own commit with a Conventional Commit title and a unit test that fails without the fix (the reviewer reproduced 3 and 4 with an injected transport; do the same in `src/lib/interactive.test.ts`).

## PR #2 (`one-run-path`)

1. `src/lib/fields.ts` `readField` text case trims the answer. QuickAdd's `inputPrompt` and `wideInputPrompt` preserve whitespace; a user typing `    indented code\n` must reach the script intact. Use the trimmed value only to decide emptiness; return `raw` as typed. Same for the number case: validate on the trimmed text, return the trimmed text (numbers are fine trimmed).
2. `fieldSpecFromForm` always sets `preselected: []` for multi fields, dropping `defaultValue`. Read how QuickAdd's own one-page form seeds a multi-select default (`/Users/christian/Developer/quickadd/src/preflight/OnePageFieldRenderer.ts` and the `|multi` handling in `src/utils/FieldSuggestionParser.ts` or `src/preflight/RequirementCollector.ts`); encode the same rule (expected: comma-separated values, keep only those that are options). Test: `defaultValue: "a"` with options a,b preselects a; `"a, c"` keeps only a.

## PR #3 (`session-hardening`)

3. `src/lib/interactive.ts` `driveSession`: a `/reply` transport failure calls `fail`, which enters `failed` but leaves the poll loop running and, because `isLive()` is then false, `stop()` never aborts. Decide the rule and encode it: a client-side transport failure (reply or poll threw) means the run can no longer be driven, so abort the polls and best-effort `POST /abort` so the plugin releases the prompt. A server-reported `error` event means the run already ended; no abort. Test: reply rejects while poll returns idle -> `/abort` is sent exactly once and no further `/poll` is issued.
4. `firstEvent` creates the handed-off `next` poll without an abort signal, so after `cancel()` that in-flight poll keeps going. Give the handoff its own `AbortController` (return it inside the `{ kind: "poll" }` handoff, or have `firstEvent` accept the controller) and make `stop()` abort it. Test: handoff poll pending, `cancel()` -> the pending fetch is aborted (the fake server sees its request closed) and `/abort` is sent.

## PR #4 (`vault-discovery`)

5. `src/lib/vaults.ts` `ensureVaultReady`: the already-open shortcut returns ok after `vault info=path` alone. Require `quickAddAnswers()` too (QuickAdd may still be loading, and the choice must be listed). Test: registry open, vault answers as itself, `quickadd:list` fails -> falls through to the open-and-poll path (and succeeds once list answers) rather than returning ok immediately.
6. `src/run-choice.tsx` `VaultGate` (around line 146): `prepareVault()` has no rejection handler, so a thrown `resolveCliPath()` (CLI path preference points nowhere) leaves the gate loading forever. Catch and render the error view with the message. If the readiness module can produce that case as `{ ok:false, message }` instead, prefer that over a try/catch in the component (the `pstack:principle-boundary-discipline` skill).

## Finish

`pnpm lint`, `pnpm test`, `npx tsc --noEmit`, `pnpm build` green on all three branches; `pnpm e2e:protocol` green from `wt/pr2` (vault-discovery). Force-push with lease. Report the new head SHAs of the three branches, the commit list per branch, the test output tails, and anything you could not do. No em dashes anywhere; use "-". `/deslop` before committing.
