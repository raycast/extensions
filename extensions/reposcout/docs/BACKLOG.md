# Backlog

Prioritized work. Each item: **Title**, Description, Complexity (S/M/L),
Dependencies. Complexity is rough engineering effort, not calendar time.

---

## Critical

### Verify in the real Raycast app

- **Description:** Run `ray develop` on a Mac with Raycast installed; confirm the
  search view renders, actions open editors/Finder/terminal, and the background
  refresh runs on its interval. The core is unit-tested, but the Raycast runtime
  wiring (preferences, `environment.supportPath`, action behavior) can only be
  confirmed live.
- **Complexity:** S
- **Dependencies:** Raycast app; a machine with real repositories.

---

## High

### Reconcile lint/build with Raycast's toolchain — ✅ mostly done

- **Description:** ~~Before Store submission, ensure `ray build` and `ray lint`
  pass.~~ Confirmed: `npx ray build -e dist` is clean and `npx ray lint` passes
  all checks except the author handle (see "Store submission" below). The flat
  config (ADR-006) is compatible with `ray lint`'s own ESLint/Prettier pass, so
  no switch to `@raycast/eslint-config` is needed.
- **Complexity:** M
- **Dependencies:** ADR-006.

### Store submission — remaining manual steps

- **Description:** Repo is prepped for the store (root `CHANGELOG.md`,
  `metadata/` scaffold, author `gmcmanus`, verified `ray build`/`ray lint` clean).
  Remaining, per [`docs/SUBMISSION.md`](SUBMISSION.md): (1) add 3–6 screenshots to
  `metadata/`; (2) `npx ray publish` to open the PR.
- **Complexity:** S
- **Dependencies:** a Raycast Store account; live app for screenshots.

### FSEvents / filesystem watching

- **Description:** Watch search roots for directory changes and trigger targeted
  incremental refreshes instead of relying only on the interval + open triggers.
- **Complexity:** L
- **Dependencies:** Indexer (done). Fits behind a new `watcher/` layer feeding
  `refreshIndex`.

### Search UX polish

- **Description:** Highlight matched characters using `FuzzyMatch.positions`
  (already produced); show ranking reason accessories; add a details pane with
  remote/last-commit/README preview.
- **Complexity:** M
- **Dependencies:** search (done), components.

---

## Medium

### Background indexing daemon

- **Description:** Move indexing out of the command process so large scans never
  block UI startup; the command becomes a pure reader.
- **Complexity:** L
- **Dependencies:** FSEvents (ideally), cache (done).

### Ripgrep integration + file search

- **Description:** Search file contents/paths within a repo via `rg`. New
  `search/` submodule reading the index for repo roots.
- **Complexity:** M
- **Dependencies:** ripgrep installed; index (done).

### Commit search / branch search

- **Description:** Search commits (`git log` grep) and branches across indexed
  repos. New git readers + search submodules.
- **Complexity:** M
- **Dependencies:** git layer (done).

### Tags & workspaces

- **Description:** User-assigned tags and named workspaces (groups of repos).
  New user-data fields + ranking signals + filter UI.
- **Complexity:** M
- **Dependencies:** user-data store (done), ranking (done).

### Monorepo / submodule awareness

- **Description:** Optional controlled descent into a repo to surface packages or
  submodules as sub-entries. Reverses ADR-003 in an opt-in way.
- **Complexity:** L
- **Dependencies:** discovery (done); ADR-003.

---

## Low

### Full DP fuzzy alignment

- **Description:** Replace greedy matching with optimal dynamic-programming
  alignment for better scoring on long/ambiguous names.
- **Complexity:** M
- **Dependencies:** `search/fuzzy.ts` (done). Current greedy is adequate for
  short repo names.

### Smart ranking (learned weights)

- **Description:** Tune signal weights from user behavior instead of constants.
- **Complexity:** L
- **Dependencies:** ranking (done), telemetry/opt-in data.

### Resolve linked-worktree gitdir for fingerprints

- **Description:** For `.git`-file worktrees, resolve the real gitdir so
  fingerprints track the actual HEAD/index rather than the working-tree root.
- **Complexity:** S
- **Dependencies:** fingerprint (done).

---

## Future ideas

- **Spotlight discovery backend** — use `mdfind` to locate `.git` dirs as an
  alternative/booster to the walker. Complexity: M.
- **Watchman support** — optional high-performance watcher backend. Complexity: L.
- **Repository metadata** — languages, size, README summary in the details pane.
  Complexity: M.
- **Recently opened view** — a dedicated command listing recency-sorted repos.
  Complexity: S. Depends on user-data (done).
- **Per-repo custom open commands** — user-defined actions (e.g. open in a
  specific IDE profile). Complexity: M.
