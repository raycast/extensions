# Raycast Review Corrections

Date: 2026-10-26. Base: d1eadb693f17bd759cf6eb8bd0b93b8cf96b298d.
Scope: this extension only. PR #32780 remains draft; coordinator owns publication.

## Independent Assessment

All three findings in [the review](https://github.com/raycast/extensions/pull/32780#issuecomment-6412527915)
were valid.

1. All three commands were no-view commands, with stop/copy controls available only
   through toast actions. Raycast documents that closed-window toasts fall back
   to non-interactive HUDs. This was confirmed by source/manifest inspection and
   the official API contract, not by a native application run.
2. A dependency-clean copy without raycast-env.d.ts failed `npm test` before tests:
   `src/speech.ts(32,45): error TS2304: Cannot find name 'Preferences'.`
3. An isolated baseline fixture wrote 501 completed recovery records; all 501
   remained. No retention or removal action existed.

## Corrections

- Kept all command names. Converted them to view commands: speech status Detail
  with Stop Waiting/Stop Playback and Copy Request ID; searchable recovery List
  with per-request/job and all-ID copy actions. Copy uses Clipboard.copy directly,
  because Action.CopyToClipboard closes the window. It does not stop speech.
- Unmount aborts only local work. StrictMode effect replay is covered against
  duplicate submission. Hiding the window is not described as guaranteed unload.
  Abrupt exit still relies on the UUID persisted before submission.
- Added explicit source preference types so tests do not depend on ignored
  generated declarations. No Raycast build/develop step is required before tests.
- Retain at most 50 completed records and normally at most 200 total records.
  Completed means successful playback, not merely successful generation/download.
  Pending and interrupted IDs are never automatically pruned. If those IDs fill
  capacity, refuse new submissions, but permit existing-record status updates.
- Serialize recovery writes/cleanup across processes with pinned proper-lockfile
  4.1.2. Abandoned locks become stale after 30 seconds; reads remain independent.
  Legacy oversized unresolved stores are preserved and block new generation.
- Bulk Clear Completed History is confirmed and cannot delete unresolved IDs.
  Individual Forget This Recovery ID has an explicit irreversible-removal warning
  and confirmation, including for pending IDs. It never cancels server work.
- Recovery UI initially renders 50 records and supports Show More/search. Viewing
  and copying are read-only. No bulk delete of unresolved history exists.
- MCP client source is byte-unchanged against the base commit. Its pinned normalized
  SHA-256 test still passes:
  `72c7a2688fc9e081e8a5f9f822d755040c1bb36e82e553a925f6b97c54df4aad`.

## Exact Verification

Runtime: bundled Node 24.19.0, npm 10.8.2.

Working-copy and fresh-copy results:

- `npm test`: **148 passed, 0 failed**, no skips/cancellations. The original 132
  cases remain, plus 16 focused review regressions. Wrapper cases now render the
  actual command components with React 19.0.0 and mocked native Raycast APIs.
- `npm run test:build`: optimized distribution build and TypeScript checks passed;
  **7 passed, 0 failed** built-command tests. Stop Waiting is invoked through the
  actual built view action rather than a toast callback.
- `npm run lint`: passed package/schema/author, icons, ESLint, and Prettier 3.8.1.
- `git diff --check`: passed.
- `git diff --exit-code <base> -- extensions/flowspeech-tts/src/client.ts`: passed.

Fresh install lives in ignored `.test-tmp/review-final/checkout`. It contains only
extension files, not prior node_modules, .build, .test-dist, or raycast-env.d.ts.
Before testing, absence of those generated artifacts was asserted. `NODE_PATH`
and `NODE_OPTIONS` were absent. Every command used `env -i`, an empty isolated HOME,
an isolated npm cache, `/dev/null` user config and a registry-only global config.

Sequence: `npm ci --ignore-scripts --no-audit --no-fund` from the locked official
registry dependencies, then `npm test` BEFORE any build, then `npm run test:build`
and `npm run lint`. npm installed 179 packages. No install lifecycle hooks ran.
Lint's only remote reads were public schema/author checks; no user credentials.

Focused coverage includes HUD-only toast semantics with reachable view actions,
copy without window closure, active player cancellation, local unmount cancellation,
StrictMode replay, 501 completed writes retaining 50 plus protected unresolved IDs,
capacity refusal before POST, updates while full, concurrent reservations, two
independent processes competing for the final slot, abandoned-lock recovery,
legacy oversized stores, paging, and confirmation-dependent removals.

React's pinned test renderer prints its deprecation warning. This is an expected
test-only warning, not a native UI test. It is excluded from production bundles.

## Distribution

Working and clean-install builds are byte-identical: eight files, 592740 bytes.
Aggregate SHA-256 over sorted relative file names, NUL, then file contents:

`a41887eeb008689db1a134da9786a73493f3a3bc751f6164912f63253eed5a33`

Inventory: package.json, unchanged icon, three command bundles and three maps.
All commands are view mode. Maps match source and the explicitly allowed locking
dependencies. Secret/absolute-path/fixture/test-renderer leakage checks pass.

## Handoff Limits

No native app launch/install, Accessibility/recording permission changes, actual
audio playback, paid API calls, commits to upstream, pushes, or public PR edits.
Only local commits are authorized. Native distribution UI, real host storage
restart recovery, and screencast remain pending user approval. Keep the PR draft.

Before committing, verify repository-local user.email is
`waeckerlinfederowicz66@gmail.com`; do not change user.name or global config.
There were no worker commits after the published base at the start of this pass.
The coordinator should inspect author/committer email on the handoff commit and
owns review, push, CI, and any eventual change to PR draft status.

## References

- https://developers.raycast.com/api-reference/feedback/toast
- https://developers.raycast.com/api-reference/user-interface/actions
- https://developers.raycast.com/information/lifecycle
- https://github.com/moxystudio/node-proper-lockfile
