# Architecture Decision Records

Each significant design decision is recorded here. Newest last. When a decision
is reversed, add a new ADR that supersedes the old one rather than editing
history.

---

## ADR-001 — Indexed repository cache instead of live filesystem scanning

**Status:** Accepted

**Decision:** Search operates on a persisted, in-memory index. Discovery/
enrichment run separately (on open + on a background interval) and write the
index; the search command reads it.

**Reason:** Scanning thousands of directories and shelling out to git on every
keystroke would be far too slow. An index makes search O(records) in memory and
feels instantaneous.

**Tradeoffs:** The index can be briefly stale between refreshes. Mitigated by
refreshing on command open and on an interval, and by cheap incremental updates.

---

## ADR-002 — Fingerprint-based incremental enrichment

**Status:** Accepted

**Decision:** During discovery, compute a cheap fingerprint per repo from the
mtimes/sizes of `.git/HEAD` and `.git/index`. On refresh, only repos whose
fingerprint changed (or is unknown) are re-enriched with git.

**Reason:** Git enrichment (branch/status/remote/last-commit) is the expensive
part. Most repos don't change between refreshes, so re-running git on all of
them wastes seconds. Fingerprints turn a refresh into "enrich only what moved."

**Tradeoffs:** A fingerprint can miss exotic state changes not reflected in
HEAD/index mtimes. Acceptable: the interval refresh and manual "Refresh Index"
action provide a full re-read path, and status is re-read whenever HEAD/index
move (the common case).

---

## ADR-003 — Do not descend into discovered repositories

**Status:** Accepted

**Decision:** Once a directory is identified as a repository, discovery records
it and does not recurse into it.

**Reason:** Recursing would index vendored/submodule/`node_modules` nested repos
and explode the result set with noise. The outermost repo is what users almost
always want.

**Tradeoffs:** Submodules and intentionally-nested repos are not indexed by
default. Monorepo/submodule awareness is a planned future feature (see BACKLOG)
that will opt into controlled descent.

---

## ADR-004 — Explicit `Result` type for expected failures

**Status:** Accepted

**Decision:** Filesystem, git, and cache operations that can fail for expected
reasons return a `Result<T, E>` (or tolerate errors internally) instead of
throwing. Unexpected programmer errors still throw.

**Reason:** The project spec mandates never silently ignoring failures and
recovering gracefully from permission/git/corruption errors. Explicit results
force callers to handle the error branch and keep control flow readable.

**Tradeoffs:** Slightly more verbose call sites than try/catch. Worth it for
testability and for guaranteeing graceful degradation.

---

## ADR-005 — Modular, weighted ranking signals

**Status:** Accepted

**Decision:** Ranking is a set of small pure `RankingSignal`s (match, pinned,
favorite, recency, frequency, git-activity, short-path), each returning [0,1],
blended by weight in `rank.ts`.

**Reason:** The spec calls for modular ranking and many future dimensions (tags,
workspaces, smart ranking). Adding a dimension should be adding one signal, not
rewriting search.

**Tradeoffs:** A weighted sum is simpler than a learned ranker and needs manual
weight tuning. That is the right tradeoff for a transparent, testable v1.

---

## ADR-006 — Flat ESLint config instead of `@raycast/eslint-config`

**Status:** Accepted (revisit before Store submission)

**Decision:** Use ESLint 9 flat config with `typescript-eslint` + React plugins,
rather than the legacy `@raycast/eslint-config`.

**Reason:** The flat config is self-contained and runs cleanly in this
environment, giving us a real, enforceable `npm run lint` as part of the
Definition of Done. It also enables `@typescript-eslint/no-explicit-any: error`,
matching the "never use any" requirement.

**Tradeoffs:** Diverges from the Raycast default. Before publishing to the
Raycast Store we should reconcile with `ray lint` (which expects Raycast's
config). Tracked in BACKLOG.

---

## ADR-007 — Separate user-data store from the repository index

**Status:** Accepted

**Decision:** Favorites, pins, and open-history live in `user-data.json`, keyed
by path, independent of `repository-index.json`.

**Reason:** The index is rebuilt from the filesystem on every refresh. If user
intent lived in the index it would be destroyed on rebuild. Separating them lets
the index be disposable while user data is durable.

**Tradeoffs:** Two files and a join at query time. The join is a cheap map
lookup and keeps each store simple and single-purpose.

---

## ADR-008 — Command entry files delegate to `commands/`

**Status:** Accepted

**Decision:** Raycast-required entry files (`src/search-repositories.tsx`,
`src/refresh-index.ts`) are one-line re-exports; the real implementations live in
`src/commands/`.

**Reason:** Keeps the enforced-by-Raycast file naming while preserving the clean
`commands/` layout from the project structure and keeping entry files trivial.

**Tradeoffs:** One extra indirection per command. Negligible.

---

## ADR-009 — Resolve editors via installed applications, not name strings

**Status:** Accepted (supersedes the initial name-string approach)

**Decision:** To open a repository in an editor, resolve the actual installed
application with `getApplications()` and match it by bundle identifier (in
priority order) with a display-name fallback (`src/actions/editor.ts`), then pass
the resolved `Application` to `open()`. Every open action is wrapped in error
handling that surfaces a Toast; nothing fails silently.

**Reason:** The first implementation passed a hardcoded display name
("Visual Studio Code") as a string to `open()`. That silently failed whenever the
editor was installed under a different name (VSCodium, Insiders, an OSS build) or
could not be resolved — the button appeared to "do nothing" with no feedback.
Matching the real installed app by bundle id is stable across variants, and the
resolved `Application` carries the correct bundle path. Surfacing failures as
toasts satisfies the "never silently ignore failures" principle.

**Tradeoffs:** `getApplications()` runs on each open (a few ms; acceptable, and
could be memoized later). Bundle-id lists must be maintained as editors change
their identifiers. A "not found" result now shows a helpful message instead of
nothing, pointing the user to install the editor or change preferences.

---

## ADR-010 — Opt-in search roots (no default whole-machine scan)

**Status:** Accepted (supersedes the `~` default from ADR-001's first cut)

**Decision:** The `searchRoots` preference has **no default**. When it is empty,
`resolvePreferences` returns an empty `roots` array; the search command shows a
"Choose folders to search" prompt with an **Open Preferences** action, and both
the hook and the background command **skip indexing entirely** (never wiping the
cache with an empty scan).

**Reason:** Defaulting to `~` scanned the user's entire home directory on first
use — slow, surprising, and it cached repositories the user may not care about.
Users asked to point RepoScout at specific folders and to be prompted when none
are set rather than have everything scanned. Opt-in roots make the tool's scope
explicit and fast.

**Tradeoffs:** One extra setup step before the extension is useful (mitigated by
a clear in-app prompt and one-click access to preferences). The index/search
architecture is unchanged — this only changes what feeds discovery.

**Alternatives considered:** Making the preference `required: true` so Raycast
forces it natively. Rejected because it also blocks the background command and
gives a less friendly, non-explanatory prompt than the in-app empty state.

---

## ADR-011 — In-extension folder picker (LocalStorage), not preferences-only

**Status:** Accepted (extends ADR-010)

**Decision:** Search folders can be chosen **inside the extension** using
Raycast's native `Form.FilePicker`, persisted in `LocalStorage`
(`src/preferences/roots-store.ts`). The pure add/remove/merge/normalize logic
lives in `src/preferences/roots.ts`; a `ManageRootsView` lists folders (in-app
ones removable, preference ones read-only) and an `AddRootForm` picks new ones.
The effective roots scanned are the de-duplicated union of preference roots and
in-app roots. The hook (`useRepositoryStore`) owns this state and re-indexes when
it changes; the background command merges both sources too.

**Reason:** Sending users to the preferences window to type paths is clumsy —
they asked for a picker within the extension. `Form.FilePicker` gives a native
folder chooser, and `LocalStorage` lets the extension manage its own list without
a preferences round-trip. Keeping the preference as an additional source means
existing setups and bulk editing still work.

**Tradeoffs:** Two sources of roots (preference + in-app). Handled by clearly
separating them in the UI (in-app = removable, preferences = read-only) and by a
pure `mergeRoots` that de-duplicates. Roots now live in two places
(`LocalStorage` for in-app, preferences for the text field), which is a small
cost for a much better UX. `roots-store.ts` is thin Raycast glue (excluded from
coverage); all list logic is unit-tested in `roots.ts`.

**Follow-up (v0.3.1):** A Raycast `Form` only persists on an explicit submit
action, so picking a folder and backing out silently discarded it. `AddRootForm`
now commits on the `FilePicker` `onChange` (with a re-entrancy guard) and pops
automatically, matching the "pick = added" expectation; the manual-path field
still commits on submit. The store also queues a follow-up scan when roots change
mid-scan (`pendingRefresh`) so a newly-added folder is never missed.
