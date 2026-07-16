# Progress

Snapshot of implementation status. Update whenever work lands.

_Last updated: 2026-07-15 — v0.3.1_

## Completed ✅

- ✅ Project setup (TypeScript strict, ESLint 9 flat config, Prettier, Vitest)
- ✅ Raycast manifest (`package.json`): 2 commands, 7 preferences, icon
- ✅ Domain types (`types/repository.ts`, `types/index-state.ts`)
- ✅ Foundations (`utils/`: Result, logger, path, async pool, display)
- ✅ Repository discovery (`filesystem/`: stack walker, kind detection,
  fingerprints; symlink-safe, permission-tolerant)
- ✅ Git enrichment (`git/`: no-shell exec wrapper, tolerant info reader, remote
  URL normalization)
- ✅ Cache layer (`cache/`: atomic JSON, index store w/ schema validation,
  user-data store)
- ✅ Incremental indexer (`indexer/`: pure reconcile + orchestrator with bounded
  concurrency)
- ✅ Fuzzy search (`search/fuzzy.ts`) — tiered scoring
- ✅ Modular ranking (`ranking/`: 7 signals, decay math, weighted blend)
- ✅ Query-time search (`search/search.ts`) — index-only, ranked, stable
- ✅ Preferences parsing (`preferences/`) — defaults, clamping, validation
- ✅ UI: `useRepositoryStore` hook, list item + action panel, search command,
  background refresh command
- ✅ Favorites / pins / recently-opened / frequency (data + ranking + actions)
- ✅ Icon asset (reproducible generator + PNG)
- ✅ Robust editor opening: resolve installed app by bundle id + toast on failure
  (v0.1.1 fix, ADR-009)
- ✅ Opt-in search roots: no whole-machine scan; prompts to pick folders when
  none configured (v0.2.0, ADR-010)
- ✅ In-extension folder picker + manager: add/remove folders via native
  `Form.FilePicker`, stored in LocalStorage; scans union of preference + in-app
  folders (v0.3.0, ADR-011). Commit-on-pick + mid-scan re-queue fixes (v0.3.1)
- ✅ Test suite: 158 tests, ~97% line coverage of the core
- ✅ Store prep: root `CHANGELOG.md`, `metadata/` scaffold, author `gmcmanus`;
  `ray build` clean and `ray lint` passing with no errors (see `docs/SUBMISSION.md`)
- ✅ Documentation suite (this file + ARCHITECTURE, DECISIONS, BACKLOG, TESTING,
  CHANGELOG, SUBMISSION, CURRENT_TASK, SESSION_SUMMARY, README)

## In Progress 🚧

- 🚧 Nothing actively in progress — v0.1.0 MVP is complete and green.

## Remaining ⬜ (see BACKLOG.md for detail & priority)

- ⬜ Verify inside the real Raycast app (`ray develop`) on a live machine
- ⬜ Store submission: add `metadata/` screenshots, then `ray publish` (author
  handle done; see `docs/SUBMISSION.md`)
- ⬜ FSEvents / Watchman incremental watching
- ⬜ Background indexing daemon
- ⬜ Ripgrep integration / file search / commit search / branch search
- ⬜ Tags, workspaces, monorepo/submodule awareness
- ⬜ Smart ranking (learned weights)
- ⬜ Spotlight discovery backend (optional)

## Definition-of-Done status for v0.1.0

| Gate                      | Status              |
| ------------------------- | ------------------- |
| Code compiles (`tsc`)     | ✅ pass             |
| Lint passes (`eslint`)    | ✅ pass             |
| Tests pass (`vitest`)     | ✅ 158 passing      |
| Documentation updated     | ✅                  |
| Architecture updated      | ✅                  |
| Progress updated          | ✅                  |
| Backlog updated           | ✅                  |
| CURRENT_TASK rewritten    | ✅                  |
| SESSION_SUMMARY rewritten | ✅                  |
| No forgotten TODOs        | ✅ (none in source) |
