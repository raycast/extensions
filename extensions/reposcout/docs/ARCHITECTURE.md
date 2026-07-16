# RepoScout — Architecture

> Keep this document synchronized with the code. Update it in the same change
> that alters the architecture. See `docs/DECISIONS.md` for the "why" behind the
> choices summarized here.

## 1. Overview

RepoScout is a Raycast extension that indexes every Git repository on the user's
Mac and provides instantaneous fuzzy search over that index. The guiding
principle is **strict separation between discovery, indexing, and search**:

- **Discovery** (filesystem) finds where repositories live.
- **Enrichment** (git) reads metadata about each repository.
- **Indexing** (indexer + cache) combines the two into a persisted index.
- **Search** (search + ranking) queries the persisted index — and never touches
  the filesystem.
- **UI** (hooks + components + commands) renders results and never talks to the
  filesystem, git, or cache directly.

Searching operates only on the cached index, which is what makes it feel
instantaneous even with thousands of repositories.

## 2. Layered module map

Dependencies point **downward** only. No lower layer imports an upper layer.

```
        commands/         ← Raycast entry points (view + background)
           │
        components/       ← React presentation (List.Item, ActionPanel)
           │
        hooks/            ← useRepositoryStore: the single UI ⇄ core seam
           │
   ┌───────┼────────────────────────────┐
   │       │                            │
 search/  indexer/                  preferences/
   │       │  \                         │
ranking/   │   \___ cache/ (index + user-data stores)
   │       │        │
   │   filesystem/  │      git/
   │       │        │       │
   └────── utils/  types/ ──┘   ← dependency-free foundations
```

| Layer          | Responsibility                                                         | Key modules                                                                                 |
| -------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `types/`       | Shared, dependency-free domain vocabulary                              | `repository.ts`, `index-state.ts`                                                           |
| `utils/`       | Pure helpers: Result, logger, path, async pool, display formatting     | `result.ts`, `logger.ts`, `path.ts`, `async.ts`, `display.ts`                               |
| `filesystem/`  | Discover repositories; classify kind; compute freshness fingerprints   | `discovery.ts`, `git-markers.ts`, `fingerprint.ts`                                          |
| `git/`         | Read branch/status/remote/last-commit via the git CLI                  | `exec.ts`, `info.ts`, `remote.ts`                                                           |
| `cache/`       | Persist the index and user data as atomic JSON                         | `index-store.ts`, `user-data-store.ts`, `json-file.ts`, `user-data.ts`, `paths.ts`          |
| `indexer/`     | Orchestrate discovery + enrichment + cache; incremental reconciliation | `indexer.ts`, `reconcile.ts`                                                                |
| `ranking/`     | Modular, weighted ranking signals                                      | `signals.ts`, `rank.ts`, `decay.ts`                                                         |
| `search/`      | Fuzzy matching and query-time search over the index                    | `fuzzy.ts`, `search.ts`                                                                     |
| `preferences/` | Parse preferences; manage in-app search-folder roots                   | `parse.ts`, `preferences.ts`, `types.ts`, `roots.ts`, `roots-store.ts`                      |
| `actions/`     | Editor labels + resolving installed apps for open actions              | `apps.ts`, `editor.ts`                                                                      |
| `hooks/`       | React state seam between the UI and the core                           | `useRepositoryStore.ts`                                                                     |
| `components/`  | List item, action panel, and the in-app folder manager/picker          | `RepositoryListItem.tsx`, `RepositoryActions.tsx`, `ManageRootsView.tsx`, `AddRootForm.tsx` |
| `commands/`    | Command implementations (search view, background refresh)              | `SearchRepositories.tsx`, `RefreshIndex.ts`                                                 |

## 3. Component responsibilities

### filesystem/

- `git-markers.ts` — **pure** classification of a directory as `normal` /
  `worktree` / `bare` from its entry names.
- `fingerprint.ts` — cheap freshness token from mtimes of `.git/HEAD` and
  `.git/index`. Used to skip re-enriching unchanged repos.
- `discovery.ts` — iterative (stack-based) directory walker. Skips ignored dirs,
  handles symlinks (opt-in) with cycle detection via `realpath`, tolerates
  permission errors, and does not descend into a discovered repository.

### git/

- `exec.ts` — `execFile`-based (no shell) wrapper returning `Result`. Non-
  interactive (`GIT_TERMINAL_PROMPT=0`) with a timeout so no repo can hang.
- `info.ts` — reads all metadata concurrently and tolerantly; an injected
  `GitRunner` makes it unit-testable without real repos.
- `remote.ts` — **pure** SSH/HTTPS/git → https browse-URL conversion.

### cache/

- `json-file.ts` — atomic JSON write (temp file + rename) and tolerant read.
- `index-store.ts` — load/save the `RepositoryIndex` with schema-version and
  shape validation; discards anything unrecognized (→ rebuild).
- `user-data-store.ts` + `user-data.ts` — favorites/pins/open-history persisted
  separately from the index (so re-scanning never destroys user intent), with
  **pure** transforms for every mutation.

### indexer/

- `reconcile.ts` — **pure** incremental plan: which discovered repos can reuse
  cached metadata (fingerprint unchanged) vs. must be re-enriched.
- `indexer.ts` — the single orchestration seam. Discovers → reconciles →
  enriches changed repos with bounded concurrency → persists → returns.

### ranking/ + search/

- `fuzzy.ts` — **pure** tiered fuzzy matcher (exact > prefix > acronym > fuzzy).
- `decay.ts` — **pure** recency/saturation math.
- `signals.ts` — each ranking dimension is a small pure `RankingSignal`.
- `rank.ts` — blends signals by weight.
- `search.ts` — filters records by match and ranks them. Never scans the disk.

### UI (hooks/components/commands)

- `useRepositoryStore.ts` — hydrates from cache instantly, kicks off a background
  refresh, exposes records + user data + progress and mutators.
- `RepositoryListItem.tsx` / `RepositoryActions.tsx` — presentation only.
- `ManageRootsView.tsx` / `AddRootForm.tsx` — the in-extension folder manager and
  native `Form.FilePicker` for choosing search folders (ADR-011).
- `SearchRepositories.tsx` — wires the hook to `searchRepositories`.
- `RefreshIndex.ts` — background/no-view command running `refreshIndex`.

### preferences/ (search-folder roots)

- `roots.ts` — **pure** normalize/add/remove/merge over folder lists.
- `roots-store.ts` — persists in-app–chosen folders in Raycast `LocalStorage`.
- The **effective roots** scanned are `mergeRoots(preferenceRoots, inAppRoots)`.

## 4. Data flow

### Discovery flow

```
searchRoots ─▶ discoverRepositories()
                 │  (stack walk, skip ignored, symlink-safe)
                 ▼
        DiscoveredRepository[]  (path, name, kind, fingerprint)
```

### Enrichment flow

```
DiscoveredRepository ─▶ readRepositoryGitInfo()
                          │  branch │ status │ remote │ lastCommit  (concurrent)
                          ▼
                     RepositoryGitInfo
```

### Indexing flow

```
refreshIndex():
  load previous index ─▶ discover ─▶ planEnrichment(discovered, previous)
                                        ├─ reused  (fingerprint unchanged)
                                        └─ toEnrich ─▶ enrich (bounded pool)
  ─▶ RepositoryIndex ─▶ store.save() (atomic)
```

### Search flow

```
query + records + userData ─▶ searchRepositories()
   for each record: fuzzyMatch(name) [or path fallback]
       matched ─▶ scoreRepository(signals) ─▶ sort desc (stable)
   ▶ SearchResult[]   (no filesystem access)
```

### Extension lifecycle

```
Command opens ─▶ useRepositoryStore
   ├─ load cache (instant) ─▶ render results immediately
   └─ refreshIndex() in background ─▶ setRecords(updated) ─▶ re-render
Background command (interval) ─▶ refreshIndex() ─▶ store.save()
```

## 5. Cache strategy

- **Two files** in Raycast's `environment.supportPath`:
  - `repository-index.json` — the search source of truth (rewritten each refresh).
  - `user-data.json` — favorites/pins/open-history (mutated per user action).
- **Atomic writes**: temp file + rename, so a crash cannot corrupt the cache.
- **Schema versioning**: `INDEX_SCHEMA_VERSION` gates loads; a mismatch discards
  the cache and triggers a full rebuild.
- **Incremental refresh**: fingerprints (HEAD/index mtimes) let unchanged repos
  skip the expensive git enrichment. Only changed/new repos shell out to git.

## 6. Design decisions (summary)

See `docs/DECISIONS.md` for full ADRs. Highlights:

- **Indexed cache over live scanning** — search must be instantaneous.
- **Fingerprint-based incremental enrichment** — avoids re-running git on every
  refresh for thousands of repos.
- **Modular ranking signals** — new dimensions are additive, not rewrites.
- **`Result` type for expected failures** — no silent catches; graceful
  degradation on permission/git/corruption errors.
- **Editors resolved via installed apps, not name strings** — open actions match
  the real installed application by bundle id (ADR-009) and toast on failure.
- **Opt-in search roots** — no default whole-machine scan; empty roots resolve to
  an empty list and the UI prompts the user to pick folders (ADR-010).
- **In-extension folder picker** — folders are chosen via `Form.FilePicker` and
  stored in `LocalStorage`; scanned roots are the union of preference + in-app
  folders (ADR-011).
- **Flat ESLint config instead of `@raycast/eslint-config`** — self-contained,
  runnable lint; revisit before Store submission.

## 7. Technical debt

- Fuzzy matcher is greedy, not full DP alignment (fine for short names; see
  `docs/BACKLOG.md`).
- No FSEvents/Watchman yet; refresh is interval- and open-triggered.
- Linked worktree fingerprints fall back to the working-tree root rather than
  resolving the real gitdir.
- `ray build` requires Raycast's toolchain/icon pipeline; CI here validates via
  `tsc` + `eslint` + `vitest` (see `docs/TESTING.md`).

## 8. Future architecture

The layering is designed so these land without rewrites:

- **Watcher layer** (FSEvents/Watchman) → drives `refreshIndex` incrementally.
- **Background daemon** → move indexing out of the command process.
- **Ripgrep/file/commit search** → new `search/` submodules reading the index.
- **Tags / workspaces / monorepo awareness** → new `RankingSignal`s + user-data
  fields; the index schema version bumps and old caches rebuild.
- **Spotlight/Watchman discovery backends** → alternative `filesystem/`
  discoverers behind the same `DiscoveredRepository[]` contract.
