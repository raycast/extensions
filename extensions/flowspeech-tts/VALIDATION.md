# Raycast Hardening Handoff

Historical handoff for commit d1eadb69. The subsequent review corrections and
their exact verification are recorded in REVIEW_FIXES.md; this report's artifact
hash and no-view implementation describe the earlier candidate, not the new one.

Date: 2026-10-26. Status: **complete, stable, and frozen for coordinator ownership**.
Branch: `codex/flowspeech-api-v1`.
The original extension landed in commit
`7bbb86d9533f1588519ea1fd1debbf3d4e878339` (PR #30680).
These changes belong to the coordinator's new update PR, not the merged PR.

## Scope and Preservation

Only this extension directory was written. Existing dirty migration work was
preserved, including the pre-existing package-lock.json changes. No dependencies
were installed or changed, and version 1.1.0 remains. MCP was read only as the
source of the accepted client; no MCP, cookbook, or podcast files were changed.
No commits, pushes, publishes, production keys, or paid generation were used.

## Implementation

- Synced the full hardened MCP client. The only differences are Raycast Prettier
  formatting and a narrow ESLint comment for intentional URL control-character
  rejection. A pinned-source hash regression prevents unnoticed client drift.
- generateSpeech now passes a required caller-known UUID and optional AbortSignal
  to generate(input, requestId, signal), and returns request/job IDs.
- Both existing speak commands reserve a private no-overwrite WAV file and await
  recovery-record persistence before submitting. Storage/output preflight failure
  prevents paid submission.
- Pending UUIDs are visible before submission. Stop Waiting and Stop Playback
  abort only local work. No code automatically cancels a server job.
- Show Speech Recovery reads metadata-only LocalStorage records and can copy all
  recovery IDs without network access or generation. Each invocation has its own
  storage key, so concurrent work cannot overwrite another request's identity.
- Abrupt host unload does not depend on a final callback: the UUID was already
  saved. Later status-update failures preserve that initial record. Text, API
  keys, audio, and result URLs are not stored in recovery records.
- Audio wrappers require fully validated v1 WAV, not header-only WAV or legacy
  PCM fallback. Temporary files use mode 0600 and are cleaned after graceful
  completion/failure; abrupt termination can prevent cleanup.

## Exact Verification

Bundled runtime:
`/Users/yinheng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`
reported **v24.19.0**. npm 10.8.2 ran with this Node directory first on PATH.

- `npm test`: **132 passed, 0 failed**, no skipped/cancelled tests:
  109 hardened-client contracts, one frozen-source match, and 22 wrapper tests.
- `npm run lint`: **passed** package/schema/author validation, icon validation,
  ESLint, and Prettier 3.8.1. Initial sandbox DNS failures were resolved by the
  approved read-only public schema/author checks; CLI/cache paths stayed here.
- `npm run test:build`: distribution build and TypeScript checks passed, followed
  by **7 passed, 0 failed** tests of the actual built commands.
- `git diff --check -- extensions/flowspeech-tts`: passed.

Wrapper tests run the actual selected/copied/API/audio/recovery wrappers with
mocked Raycast APIs, HTTP, and playback. Coverage includes UUID persistence before
POST, private-file preflight, cancellation, concurrent requests, storage failures,
download failure without resubmission, WAV rejection, redaction, and recovery.
A child process is forcibly terminated during submission; a fresh process then
retrieves the saved UUID without making a request. This is a simulated host
termination test, not a real Raycast UI test.

## Artifact

`npm run build` uses `ray build -e dist -o .build`; it does not install or launch
the extension. The eight-file distribution contains three command bundles and
maps, package.json, and the unchanged icon. Source-map source contents match the
current source files; the artifact inventory and secret-pattern scan passed.

Build aggregate SHA-256:
`7e4b2f5e39648323c1071725564287d09dd232619c53ce7c3a7333de1f03f271`.
Computed over sorted relative file names, each followed by NUL and file bytes.

Prettier-normalized frozen MCP client SHA-256, excluding the Raycast ESLint comment:
`72c7a2688fc9e081e8a5f9f822d755040c1bb36e82e553a925f6b97c54df4aad`.

## Worker-Changed Files

`.gitignore`, `CHANGELOG.md`, `README.md`, `package.json`,
`src/api.ts`, `src/audio.ts`, `src/client.ts`, `src/speech.ts`,
new `src/recovery.ts`, new `src/show-recovery.ts`, `tsconfig.test.json`,
`test/client.test.mjs`, new `test/fixtures.mjs`,
new `test/client-sync.test.mjs`, new `test/host-fixture.mjs`,
new `test/host-process.mjs`, new `test/wrappers.test.mjs`,
new `test/built-check.mjs`, and this report.
Ignored TypeScript/build outputs were regenerated. The package-lock diff predates
this worker and was left untouched.

## Remaining Coordinator Actions

Review/commit/push through the pending update PR and run CI using Node 24 with
`npm test`, `npm run lint`, and `npm run test:build`.
No implementation or local-tooling blocker remains.

Actual Raycast UI execution, real encrypted-storage restart behavior, audio
playback, and Store acceptance were **not** tested. Perform authorized manual
application QA separately. No publishing credentials or authorization flows
were tested or used. Ownership now returns to the coordinator; no further edits
are planned by this worker.
