# Development notes

Implementation notes for maintaining and releasing File Search by Usage. The [README](README.md) covers what the extension does; this document covers how.

## Requirements and search backend

File discovery uses `fd`. Name queries use an in-process SQLite FTS5 index. There is no Spotlight search: no `mdfind` calls and no fallback. One `mdls` call reads optional usage counts and last-used dates for folder ranking, never search results. See Caches and storage for its deadline and failure behaviour.

- **Runtime:** Raycast on macOS, with the Node.js runtime it bundles, which exposes `node:sqlite` and SQLite FTS5. Verified against Raycast's Node 22.22.2 and SQLite 3.51.2. Recheck the distribution build in Raycast before release; a successful build does not verify runtime support.
- **Crawler:** a separately installed `fd` (`brew install fd`, verify with `fd --version`). Required for rebuilds, not for querying an existing index. `src/lib/fd.ts` checks an explicit absolute `fdPath` preference first, then `PATH` and the common install directories. An invalid explicit path is an error, not a reason to silently pick another binary. Scopes and symlink targets must be readable with Raycast's permissions.
- **Development:** Node.js with `node:sqlite` and FTS5 available without an experimental flag, plus npm. Node 22.22.2 matches the verified Raycast runtime. `npm ci` installs the locked dependencies. Install fd to exercise the real-crawler checks; they are skipped when the binary is absent.

Users install nothing else, and the extension neither bundles nor installs fd.

## Project layout

```text
src/search.tsx              search command
src/rebuild-index.tsx       manual search-index rebuild command
src/index-settings.tsx      scope, pattern and stats editor
src/delete-data.tsx         standalone data-deletion command
src/components/browser.tsx  shared search and navigation view
src/components/row.tsx      result row and action panel
src/components/navigation-actions.tsx  up and return-to-start actions
src/components/search-history-actions.tsx  previous and next query actions
src/components/hidden-files-action.tsx  shared hidden-file toggle action
src/components/search-options.tsx  independent type and sort choices in one dropdown
src/components/native-search-navigation.tsx  bounded native root and active search route
src/components/search-screen.tsx  per-location query owner and result prop store
src/components/use-folder-selection.ts  initial focus and selection restoration
src/components/use-event-handles.ts  stable callbacks released on view unmount
src/components/use-directory-listing.ts  watched folder-listing subscription
src/components/use-cached-entries.ts  one bounded validation pass per memory source
src/components/use-standard-places.ts  start locations, read off the render path
src/components/use-shared-cloud-folders.ts  unindexed Drive roots, read after the first frame
src/components/use-path-bar-listing.ts  the typed-path listing and its exact-match entry
src/components/use-search-history-recording.ts  settled-query recording and learned pairings
src/lib/types.ts            shared entry, visit, and sort types
src/lib/query.ts            parsing, filters, and match tiers
src/lib/score.ts            ranking weights
src/lib/result-order.ts     Usage and explicit sort comparators
src/lib/rank-sources.ts     pure source merging, matching, scoring, and deduplication
src/lib/display-rows.ts     bounded rendering with selection retention
src/lib/accessory-columns.ts  fixed-width columns for the row accessories
src/lib/list-view.ts        what the list shows, as one total function
src/lib/status-line.ts      which caveat the status line shows, in priority order
src/lib/search-history.ts   the query-history cursor, as one step function
src/lib/use-navigation-tracing.ts  development-only navigation and heap samples
src/lib/format.ts           scope label, size, duration, and relative time
src/lib/folder-navigation.ts  active folder and obsolete-callback guards
src/lib/search-limits.ts    ranking and display limits
src/lib/progress.ts         search-stage model
src/lib/history.ts          exponential usage history and abbreviations
src/lib/read-dir.ts         directory reads, path helpers, and cloud locations
src/lib/bounded-directory.ts  opendir read that stops one entry past its limit
src/lib/directory-listing.ts  asynchronous metadata reads, watching, and polling
src/lib/bounded-reads.ts    physical read limits and removable cancelled waiters
src/lib/recent-validation.ts  shared bounded pool for recent-result metadata
src/lib/work-queue.ts       independent workers and cancellation-aware backpressure
src/lib/name-order.ts       shared numeric filename collation
src/lib/entry-identity.ts   storage paths and stable row ids
src/lib/starting-paths.ts   standard and cloud start locations
src/lib/spotlight.ts        the one mdls call, for usage metadata
src/lib/usage-cache.ts      per-directory usage-metadata cache
src/lib/fd.ts               fd discovery across install locations
src/lib/index-db.ts         SQLite schema, pragmas, and connections
src/lib/index-scan.ts       fd crawl, metadata collection, and refresh semantics
src/lib/fts-query.ts        injection-safe FTS5 MATCH construction
src/lib/db-search.ts        indexed name queries with filters pushed into SQL
src/lib/index-reader.ts     cached read connection and coverage reporting
src/lib/index-build.ts      rebuild orchestration, Raycast-free
src/lib/index-rebuild.ts    support path, lock wiring, and shared rebuild feedback
src/lib/index-settings.ts   scope and pattern rules, Raycast-free
src/lib/index-settings-store.ts  LocalStorage half of the settings
src/lib/indexing-lock.ts    cross-process exclusion for indexing and deletion
src/lib/owned-lock.ts       ownership-checked lock acquisition and cleanup
src/lib/storage-lock.ts     short storage transactions and reset generations
src/lib/store.ts            LocalStorage persistence
src/lib/erase.ts            data deletion under both locks
src/lib/discovered.ts       caches nothing writes, kept only so deletion removes them
src/lib/navigation-diagnostics.ts  development-only navigation and heap logging
harness/rank-harness.ts     synthetic checks and opt-in live diagnostics
harness/source-slice.ts     anchored reads of shipped component source
harness/rank-sources-checks.ts  pure ranking, metadata merging, filters, and aliases
harness/result-order-checks.ts  Usage and explicit sort comparators
harness/type-filter-checks.ts  type filtering and query-directive precedence
harness/sort-checks.ts      dropdown state, stable values, and persisted choices
harness/list-view-checks.ts  every list state shows something
harness/list-render-checks.ts  bounded rendering and selection retention
harness/row-render-checks.ts  row and action-panel rendering, including unmounted trees
harness/accessory-column-checks.ts  accessory column widths
harness/browser-checks.ts   browser cancellation, merging, and storage races
harness/search-screen-checks.ts  controlled-input commits during live updates
harness/folder-selection-checks.ts  initial focus and restored selections
harness/folder-usage-checks.ts  frozen usage snapshots and nonblocking metadata warmup
harness/cached-entry-checks.ts  bounded validation of remembered paths
harness/event-handle-checks.ts  stable callbacks released on unmount
harness/navigation-memory-checks.ts  native route bounds, cleanup, and root input
harness/navigation-stack-checks.ts  active folder transitions and stale-callback guards
harness/performance-checks.ts  freshness, cancellation, and ordering regressions
harness/live-search-checks.ts  bounded queues, large listings, and stalled reads
harness/index-checks.ts     fd lookup, FTS building, schema, scans, and queries
harness/index-safety-checks.ts  cancellation boundaries, reader recovery, and failures
harness/indexing-checks.ts  index preservation and indexing/deletion overlap
```

The filesystem scans do not import `@raycast/api`, so the harness can exercise them outside Raycast.

## Search pipeline

Raycast's native `List` throttle coalesces typing for about 250 ms before it delivers the latest query to the extension. After that, name search is one synchronous SQLite query behind a 20 ms debounce. Nothing streams. The native delay applies to Everywhere and to folder filtering, and it is not part of worker timing samples.

1. Load visits and pins, saved searches, learned pairings, and the index coverage summary. Their readiness, plus any applicable cached-path validation, is what the initial list waits on.
2. Collect the applicable memory and direct-read sources: folder children, standard locations, visited and pinned paths, learned queries, discovered shared-folder roots, and explicit path listings. Attach previously cached usage to folder children.
3. For a global name query, after the debounce, query the index with usable terms of at least three characters as ANDed filename-prefix phrases. SQL filters run before the 50 newest matches are selected. Folder, explicit-path, hidden-only, and filter-only searches skip the index.
4. Merge, filter, deduplicate, and rank the applicable sources, keep at most 50 rows, and publish once no result-producing stage is running. A short global query issues no FTS lookup, so its memory results render while the index stage reports that it needs more characters.
5. Warm optional folder usage metadata in the background for the next query, folder visit, or refresh. Do not publish it to the current list.

Folder listings and cached-path validation return a finished result rather than growing batches. Watcher refreshes and user actions still update the list. Filesystem work has deadlines: a folder listing gets three seconds, cached-path validation two. Whatever they do not read is reported as omitted or partial. Optional usage warmup has its own three-second deadline and a 50-path budget, and holds back neither results nor status. The SQLite statement has no deadline, so a broad match can exceed the latency target.

The lookup and its publication run synchronously inside the debounce callback, with no awaited response that could arrive after a newer lookup. Superseding input clears the pending timer. A running SQLite statement blocks the worker until it returns; cancellation does not interrupt it. Asynchronous filesystem and storage results use abort and generation guards to reject obsolete work.

Indexed search starts when the longest name term reaches three characters. A folder-scoped query filters direct children at any length and never touches the index, though direct-child usage metadata is still read. Cached candidates are restricted to immediate parents before validation, and the final ranker applies the same limit to every source, including canonical paths reached through symlinks.

### The index

`fd` does the crawling. It already handles symlink loops, permission errors, and exclusions, which a JavaScript walker would have to reimplement. It is spawned with an argument array, never an interpolated shell string:

```
fd --absolute-path --print0 --follow --show-errors --no-ignore --hidden
   --exclude .git --exclude node_modules ... . <root>
```

`--hidden` follows the hidden-files setting. `--no-ignore` is replaced by `--no-require-git` when ignore files are respected. The user's patterns are appended as further `--exclude` values.

Output is a NUL-delimited stream, decoded with `StringDecoder` so a multi-byte character split across chunk boundaries survives. fd marks directories with a trailing separator, which is stripped before the path is stored. Metadata comes from one `lstat` per entry through a 16-worker pool; a symlink also gets a `stat` and a `realpath` so its target is recorded without losing the visible path. Broken links are kept. File contents are never read.

fd canonicalises the root it is given, so `/var/x` comes back as `/private/var/x`. `resolveRoots` realpaths the configured roots before the scan, which keeps exact-path lookups working and stops one root appearing under two spellings. `normalizeRoots` then drops any root contained in another, so overlapping configuration cannot double-index a subtree.

Rows are written in `BEGIN IMMEDIATE` transactions of 1,000. Each scan takes a new `scan_id`. Stale-row deletion is scoped to one root and requires error-free completion. Every nonzero fd exit is a failure: exit 1 means "no matches" only with `--quiet`, which the crawler never passes. `--show-errors` also reports traversal diagnostics on successful exits, and those conservatively mark the root incomplete, including symlink-loop warnings. Cancellation is checked inside the loop and again after the final output and metadata flush. An unvisited root prevents a complete report, and with it the cleanup of unconfigured roots. Earlier roots that completed may already have removed their stale entries.

### Configurable scope

`src/lib/index-settings.ts` holds the scopes, the user's exclusion patterns, and three flags, as one JSON value in LocalStorage that is read on every rebuild. Parsing falls back per field rather than wholesale, because a corrupt or hand-edited value must not be what stops someone indexing. A field that is missing or is not a list falls back to its default, so a truncated file still indexes the home folder. A field holding an empty list stays empty, because a user who removed every scope meant it. Those two cases look alike and are not: treating a missing list as an empty one meant a truncated file indexed nothing. Lists are trimmed, deduplicated, and bounded at 32 scopes and 128 patterns.

Scopes must be absolute. fd receives the root directly, so a relative path would resolve against whatever directory the Raycast process happens to have.

Defaults are the home folder plus detected Google Drive roots, with hidden indexing and ignore-file handling off. Normalization collapses contained roots, including descendants of `/`. `/Applications` is not a default scope. The editable default patterns exclude temporary files, caches, `Library/Application Support`, the three Containers directories, and Mail, while keeping document storage such as iCloud Drive. Turning off Drive detection does not exclude Drive paths under the home scope.

Patterns are passed to fd verbatim as `--exclude` values, so fd's glob syntax is the syntax: nothing to translate, and no pattern language of our own to maintain. `INDEX_EXCLUSIONS` always applies on top, and the editor shows it read-only, so the effective scope is visible on one screen.

`useIgnoreFiles` drops `--no-ignore` and adds `--no-require-git`. Without the second flag, fd applies gitignore rules only inside a repository, which would make the setting do nothing in an ordinary folder.

The editor is a command rather than a preferences pane, because manifest preferences are static and single-valued. Its lists are in LocalStorage; the manifest keeps the hidden-file default, score visibility, and the fd path. Adding a scope pushes a one-field form using `Form.FilePicker` with `canChooseDirectories`.

Every row's first action is non-destructive. The search bar doubles as the pattern input, so Return has to add rather than delete whichever row is selected; removal uses `Keyboard.Shortcut.Common.Remove`.

A root removed from the configuration would otherwise keep its rows forever, because `scanRoot` only deletes stale rows for roots it scanned. `forgetUnconfiguredRoots` drops rows and coverage for any root outside the configured set, but only when every configured root completed. After a partial, failed, or cancelled run there is no way to tell a removed root from one the run did not reach, and deleting on that basis would throw away an index because a mount was slow.

### Storage and queries

`node:sqlite` ships with the Node runtime Raycast bundles, compiled with FTS5. No native module, no subprocess per query, no Python. The distribution build leaves `require("node:sqlite")` external.

The database is in the extension's support directory. `files` holds one row per path. `files_fts` is an external-content FTS5 table over `name` alone, kept in sync by three triggers. External content means the index stores terms and reads column values back from `files`, which is what keeps the FTS data near 18 MB against a 360 MB table for roughly 479,000 paths. The tokenizer is `unicode61 remove_diacritics 2` with `prefix='2 3 4'`.

The index is never loaded into JavaScript. Queries are `LIMIT`ed statements, and the rows they return are the only entries that exist as objects.

Ordering inside SQL is `mtime_ms DESC`, which decides the 50 rows that survive the limit. The ranking the user sees is applied afterwards in JavaScript, which is where the visit log is. Recency is a useful proxy on its own, and it measured cheaper than `bm25` on every query tried, by a wider margin on broad terms. `db-search.ts` records those measurements.

Folder browsing does not use the index. It reads direct children from the filesystem, so a folder shows current files whether or not a scan has seen them.

Type, hidden-file, extension, date, and size filters are pushed into the SQL `WHERE` clause, so they decide which rows reach the 50-row cap instead of trimming the list afterwards.

The read connection is cached per process in `index-reader.ts`. A local rebuild drops it; a statement failure closes it and reports `failed`. Missing and failed opens are retried on next access, so a rebuild launched elsewhere can make an absent index available without restarting search. A missing or wrong-version database falls back to memory. A connection opened before a failing pragma or schema read is closed explicitly.

Bulk scans suspend FTS maintenance and restore it once after scanning, including after a partial scan. During a scan, committed rows can be newer than the name index, and new names become searchable when FTS is rebuilt. Finalization failures propagate as a failed build, connections close in `finally`, and the suspended marker lets the next writer recover. The standalone command and the search action share one progress and outcome path.

Write connections use WAL with `synchronous=NORMAL`, a 5-second `busy_timeout`, and an 8 MB page cache. WAL is what lets a search read while a rebuild writes. `PRAGMA user_version` carries the schema version; a version mismatch or a corruption error rebuilds the file from scratch rather than failing the command.

### FTS5 safety

Everything typed is data. FTS5 has its own grammar, so an unquoted term goes through it: a bare `---` is a syntax error rather than an empty search, and `AND` is an operator rather than a word. `fts-query.ts` wraps every term in a double-quoted string literal with internal quotes doubled, and puts the prefix `*` outside the quotes. A term made only of punctuation produces no tokens, so it is dropped rather than ANDed in, which would empty an otherwise good result set.

### Limits

`src/lib/search-limits.ts` defines one 50-result budget, shared by SQLite candidates, retained ranked rows, and displayed rows. The SQL `LIMIT` is `50 + 1`, so truncation is distinguishable from an exact fit. The browser merges memory and index sources in one ranking pass and then caps, preserving the selected path. Temporary candidate arrays may exceed 50, because every admitted direct child has to be filtered and compared before the best 50 can be chosen.

Other bounds sit with their owners: a folder listing retains 3,000 children, and each cached source returns 50 matching entries. Coverage status reads the small `index_roots` summaries the writer maintains rather than counting rows in `files`; a full-table count costs about 55 ms warm and 2.56 s on first access. Those summaries are saved scan totals, not live counts of uncheckpointed work during a rebuild. The settings screen can still request detailed index statistics.

A crawl has a shared 15-minute budget and accepts an optional entry cap. A per-root abort timer stops fd at the remaining deadline even when stdout is idle, and the timer is cleared when that root finishes. Pending metadata reads and the final FTS rebuild are not preemptible, so this is not a hard deadline for the whole command. Reaching a limit marks unfinished coverage partial and preserves unseen rows.

### Cancellation

Changing the query clears the pending debounce timer and aborts the query controller. Changing hidden-file visibility rebuilds that controller, and the outgoing one is aborted in its own cleanup effect so cached reads holding its signal stop. React's development-mode effect replay renews an already-aborted query controller only while its scope is still live, so startup and initial route queries do not wait for another keystroke. Folder navigation cancels the old scope and unmounts its result view, and each destination starts with a blank query. Selection, Quick Look, details, and window visibility cancel nothing.

A rebuild accepts an optional abort signal. Cancelling kills fd, and the flag is rechecked after the final metadata flush; the interrupted root keeps its unseen saved paths. Nothing in the shipped extension passes that signal: `src/rebuild-index.tsx` and the search action both call `rebuildWithFeedback`, which calls `rebuildSearchIndex` with progress callbacks only. No action cancels a rebuild in progress, and nothing schedules one. A root that completed earlier may already have removed stale rows before cancellation.

### Navigation

`NativeSearchNavigation` uses Raycast's Navigation API with at most two routes: global search at the root, and one reusable folder route above it. Only one result producer is mounted, so leaving the root releases its results before pushing the folder route. Later folder transitions reuse that route and its native input, replacing the keyed result producer and query owner, which avoids a native pop and push for every folder change. Native Back recreates default results with a fresh frame ID and an empty query. The pop callback schedules owner updates in a microtask, because Raycast invokes it inside a state updater.

`FolderNavigation` stores the active folder, its numeric ID, and any requested initial selection, and no folder history. Fresh IDs reject old callbacks even after revisiting the same folder. Unmounting runs the search, watcher, timer, and validation cleanups, which makes previous results collectable. `⇧⌘↑` requests selection of the folder just left.

**Return to Start** (`⇧⌘H`) resets `FolderNavigation` to a new global frame, clears the query and selection, and cancels the previous scope before returning to the default root. Session hidden-file state and cached sort and type choices survive. Stale reset callbacks are ignored. The action is available from result rows and empty lists, except on the already-empty global screen. Bare Escape stays host-controlled, including whether it clears text before navigating back; see the known exit issue below. Clearing an Everywhere query restores the default results in place, and clearing a folder query leaves the folder open.

The default root uses the same result view as search, including recent items, pins, places, the dropdown, and the normal item actions. Typing and query-history actions reuse the same native input and result producer, with no delayed route replacement and no second round of initialization. Details visibility and the query-history cursor are per-result-view state and reset when the location is replaced; saved queries, type and sort choices, and session hidden-file visibility survive.

`SearchScreenView` keeps the native `List` mounted within one route while its result producer publishes props through `SearchScreenContent`. Each location owns a new `SearchScreen`, and cleanup drops its rows and callbacks. While a folder is open, the root retains only its small, blank, inactive input shell. A small renderer store passes the latest session settings and folder frame into the pushed route. Native event handlers use `useEventHandles`: controls receive small stable functions whose targets are cleared when their result view unmounts, so retained control props cannot keep the old view's result arrays alive.

Known live-test issue: Escape exits normally from a newly opened default screen, and folder Back restores the default results, but the next Escape after that restoration does not reliably exit. The React harness checks route bounds and cleanup, not host exit: the SDK retains its last route and relies on the native host to leave the command. A mocked root unmount is not verification of this.

`SearchScreen` owns query text separately from releasable result props, so React's development-mode effect replay cannot erase an initial query. `SearchScreenView` always enables Raycast's native `throttle`, independently of published result props. Immediate result updates lose letters during rapid input on Raycast 2.4.1, even with title-only rows; native throttling keeps them with the complete interface. Raycast updates its text field at once and delivers the coalesced query after about 250 ms. On receipt, the extension updates its query synchronously in the same batch as Raycast's input-event counter. The result view subscribes with `useSyncExternalStore`, and result publications preserve the text instead of writing back an older copy. Query-history changes use the frame-checked setter, each folder location starts with empty text, and result-only publications do not rerender the query consumer. The harness covers all of that, plus the throttle contract and route bounds under repeated folder transitions. Native keystroke capture and command exit need live tests.

The search effect depends on a memoized primitive query key rather than the parsed-query object, because depending on object identity lets any caller that reparses on every render produce an effect-render loop.

When `environment.isDevelopment` is true, the extension logs navigation transitions, result-view lifetimes, requested and reported selection positions, heap usage by space, and active resource counts. Samples carry counts and IDs, not filenames or paths. They go to the development console and to `raycast-file-search-navigation.log` in the macOS temporary directory, bounded to roughly 256 KB. Post-unmount samples run after one second, and collection is up to the worker, so they do not imply immediate reclamation. Nothing is logged when `environment.isDevelopment` is false; a locally installed build can still run in development mode.

`search-results-ready` records scope, query length, row count, and `elapsedMs` once per query controller. Timing starts when `SearchScreen` receives changed text, or when the screen is constructed for startup, and ends when ready result props are published. Result-only publications and rejected stale inputs do not reset the clock. This is worker input-to-results latency: it excludes the native throttle and compositor paint. To inspect samples without logging filenames or query text:

```bash
rg 'search-results-ready' "${TMPDIR%/}/raycast-file-search-navigation.log"
```

### What the list shows

`chooseListView` is one total function in its own module, so its input space can be enumerated. The harness walks every combination of its boolean and error inputs across empty, single-row, and many-row lists with and without a query, and asserts that none returns nothing to show, and that every non-row state carries a title and a description. The failure it exists to prevent is a blank screen with no message.

Rows win whenever anything will render: the state is how many rows the component will pass to Raycast, not how many it holds. A view being replaced is the one reason checked before the specific ones, because its rows were dropped on the way out and any other reason would describe the scope the user just left.

Raycast withholds the empty view of a list that is loading, so a list with no children and `isLoading` set shows no rows, no message, and no reason why. `isLoading` is therefore derived by `listIsLoading`, which allows it only alongside rows, and `SearchScreen` drops the flag from any prop set with no children. The placeholder props a route holds before its result view publishes carry no loading flag either, so Raycast shows its own default empty view rather than nothing. The harness checks both: no state returns a message the loading bar would hide, and no prop set reaching the native list combines loading with nothing to show.

The list renders at most 50 rows, including a retained selection. `displayRows` keeps the first 50 ranked results and replaces the last one with the selected item when it falls outside that subset. A query-keyed reader obtains the pending parent target or the live native selection before the upstream cap, so sorting cannot discard that row before the selection hook sees it. It stores no previous result arrays, and a new query cannot inherit the old selection. Action menus and detail panels are separate components that Raycast mounts only for the selected item, so other rows do not build those trees. Ordinary native selection notifications update a ref rather than React state; only establishing or releasing initial focus changes selection state. There is no pagination state and no load-more callback.

Each row carries a pin slot, the open count, an optional usage score, and the modified date, in that order. `List.Item.Accessory` has no width or alignment field, and Raycast lays accessories out from the right at the size of their content, so a row whose cell is missing or merely shorter moves every column to its left. `accessory-columns.ts` measures one set of widths over the rows that will render and pads each cell with FIGURE SPACE, which is one digit wide. The padding sits between two zero-width characters so it is never leading or trailing, which a renderer that trims its labels would discard. The pin slot holds a transparent image when the item is not pinned, so it stays the same box as the icon it stands in for. Rows are published once, so the widths do not move while the list is on screen. Two things this cannot align: the date varies by less than a digit, because "4mo" and "6d" differ in the widths of their letters, and a cell wider than its column is left alone rather than truncated.

### Completion state

`src/lib/progress.ts` defines four stages: memory, folder, index, and ranking. Every stage is `done`, `running`, `waiting`, `skipped`, `partial`, or `failed`. The progress bar, the colored status light, and the section heading all derive from that object. The heading puts a shortened location, the count, and the status in one text field rather than a wrapping subtitle. A long path shows its final two components, capped at 40 characters.

A search is complete only after every applicable stage is done or skipped. A partial stage outranks pending stages in the status light, so orange can appear while other work runs. A failed folder or index stage outranks both and shows red. Optional usage warmup takes no part in completion or error status. Caveats do not determine the light and can appear alongside green. They report:

- A missing index, or one whose last rebuild left a location incomplete
- A folder being read directly rather than queried
- The 50-row limit, which can appear with green when the folder read is complete but only a subset is shown

Starting a new search clears pending usage metadata from the old one. An empty directory finishes its folder stage at once.

A folder uses a snapshot of already-cached usage immediately. A background pass reads at most 50 uncached paths and writes only the cache, which the next query reuses. A successful empty metadata result is cached as checked too, so unused files cannot starve later children. A failed or incomplete read caches only returned values and leaves unknown paths retryable. Search history and cached indexes keep the status yellow until they finish, and the rows are held while they do. An index query that cannot run reports `failed`. A database that is absent or the wrong version reports `missing`, which is a caveat rather than a stage failure.

### Selection while results reorder

Row IDs are `generation:path`. The generation changes when the normalized name terms, the effective type, or the scope changes.

One predicate decides whether rows render and whether a selection is requested, because they are one decision. `listReady` is true when the result view is active and `rowsCanChange` reports that no stage is still running. Rows render only then, and only then does the hook receive a source other than `waiting`. Holding rows and requesting selection together means the extension and Raycast both choose from the finished list, instead of Raycast selecting an unranked row before the initial request arrives. Optional `mdls` enrichment is excluded from that wait and never republishes the current rows, which keeps its latency and its late reranking out of the list.

Folder children are derived synchronously from the directory listing and the query's frozen usage snapshot. There is no effect-driven intermediate child state, so directory readiness and prepared rows arrive together, with no transient empty list and no premature initial focus.

`rowsCanChange` asks only whether a stage is running, which is narrower than an unsettled list. An index below the character minimum reads `waiting`, meaning it will not be queried for this query at all, so a one- or two-character query's memory results are final and render at once.

Initial selection is requested in an effect after the rows are published; it does not wait for Raycast to report a selection first. The chosen path is published within the 50-row display before a later commit requests focus, even when an earlier native selection was elsewhere. The browser marks ready rows as immediately selectable, skipping the hook's optional 200 ms delay for incremental callers.

The chosen path is retained across reranking. Changing the query rearms initial selection and cancels the old timer; leaving the view clears it. Repeated acknowledgements do not trigger renders. The first native report is treated as automatic restoration; a later different valid row is treated as user navigation and cancels automatic focus, as does a native move after the requested row is acknowledged. Raycast does not identify the source of selection events, so that distinction still needs live UI testing. Up keeps priority for the folder just left and releases its request when acknowledged. Late automatic reports rearm unacknowledged requests without changing their target. If Raycast reports no selection, or the automatic target disappears, focus is rearmed once rows are available, briefly releasing the controlled ID first. A request cannot select a target excluded by the effective filters or absent from the retained results. After the user takes control, the highlight follows the selected file through reranking while it stays among the retained results, and the bounded display includes that file without rendering the rows in between.

## Query matching and filters

`SearchOptions` groups type and sort choices in one dropdown. `sort-mode` and `type-filter` use separate `useCachedState` keys. The selected sort item includes the effective type in its title, so the closed dropdown shows both settings. Item values stay fixed when either setting changes, because replacing a selected value can make Raycast fall back to All Types. Change handlers ignore echoed values. Query directives override the saved type through `parseQuery`'s default-type argument, leaving the original query text and the learned-query key unchanged.

The effective type is passed to cached-entry validation before its result cap, and checked again during final ranking, including for learned and path-bar matches. Changing the effective type cancels the obsolete query and resets row IDs without restarting the folder watcher. Path-bar parsing runs only in Everywhere, and treats the text as a path rather than a name query with directives appended.

The list disables Raycast's built-in filtering, which would replace the extension's ranking. `src/lib/query.ts` assigns these match tiers:

| Tier | Match                                                            |
| ---: | ---------------------------------------------------------------- |
|  -10 | Learned query-to-item pairing                                    |
|    0 | Name prefix                                                      |
|   10 | Prefix of a word in the name                                     |
|   20 | Name substring                                                   |
|   30 | Name subsequence                                                 |
|   40 | Every token appears, but the best match is in the enclosing path |
|   50 | Tight whole-path subsequence                                     |

Tiers are separated by 10. `ORDER_PENALTY` adds 5 when terms appear in a less natural path order, which keeps the match while ranking the ordered form first.

Filename subsequences allow arbitrary gaps. Only the whole-path fallback requires at least four query characters and a span no longer than three times the query length. Positional quality affects the score within a Usage tier, not whether a filename subsequence is admitted. A learned pairing skips textual and extension matching, but still passes the type, size, and modification-date checks.

These tiers rank every source. What they cannot do is admit a row the index never returned, and the index is deliberately stricter than the ladder above: it stores filename words, not filename or path trigrams, and matches word prefixes only. Tiers 20 and 30, substring and subsequence, are therefore reachable for memory results and unreachable for a file the extension is seeing for the first time. Tier 40, a match in the enclosing path, is memory-only too, because the FTS table indexes `name` and not `path`.

Opening, entering, pinning, or explicitly learning an item can make its path a future memory candidate; merely displaying an index match does not save it. Memory is bounded: starting candidates are the top 40 recorded visits, pins, and standard locations, with learned pairings collected separately.

`parsed.longest` is the longest typed token, with a tie going to the later one. It informs status and positional quality. `buildFtsQuery` includes every usable term of at least three characters, not just the longest, and joins their prefix phrases with AND. Punctuation-only and shorter terms are dropped, so `rep 20` asks the index for `rep`. Separate terms may match in either order within the filename, while separators inside one typed term form an adjacent phrase, so `report-2026` is more restrictive than `report 2026`.

The README lists the filter syntax. What matters here: every filter runs in SQL, and each file is its own row, so `foo ext:pdf` matches the file directly and needs no folder expansion. `-f` and `size:` exclude folders. `ext:` is a name-suffix check, so a folder named `foo.pdf` can match `ext:pdf` unless File or `-f` is also selected, and multi-part suffixes such as `tar.gz` are supported. Date bounds use midnight UTC, with `after:` inclusive and `before:` exclusive. Size bounds are strict comparisons over powers of 1024, and accept decimals. Inside a folder, filtering stays limited to direct children.

`Browser` initializes hidden-file visibility from the `showHidden` preference and keeps the toggle state for the command's lifetime, across folder changes. It is not persisted. Effective visibility is the session choice OR `parsed.hidden`, and the caller folds that into the `name NOT LIKE '.%'` clause. Changing it restarts directory reads and reruns the index query, with each effect cancelling its previous work, and cached dot-prefixed rows are filtered at ranking time too. Explicit path-bar targets stay reachable. This is about dot-prefixed names, not Finder's separate hidden-file attribute.

A dot-prefixed term such as `.config` finds indexed hidden names beginning with `config`, but cannot discover names excluded at crawl time, since fd receives `--hidden` only when Include Hidden Files is on. `.config editor` asks for one hidden filename containing both words. A bare `.` skips the index and lists hidden home entries directly; inside a folder it filters direct children.

A filter-only query does not reach the index: `parsed.longest` is empty, so there is no term to ask for. Asking for every file of a common extension would exceed the result cap before ranking anyway.

## Ranking

The weights are in `src/lib/score.ts`. `rank-sources.ts` is pure: callers provide the wall clock, the usage clock, the source entries, the query, the scope, and the sort choice. It merges duplicate-path usage metadata without mutating its inputs, and deduplicates same-name filesystem identities through a map of result positions. The browser memoizes one merged ranking pass and uses a snapshot of cached folder usage per query, while background usage reads update only the cache.

| Signal                         |        Weight | Decay                                  |
| ------------------------------ | ------------: | -------------------------------------- |
| Recorded opens                 |           100 | 120-action half-life on an event clock |
| Modification time              |            40 | 14-day wall-clock half-life            |
| Usage metadata from `mdls`     |            25 | 30-day wall-clock half-life            |
| Positional name quality        |            30 | None                                   |
| Depth below the current folder | -12 per level | None                                   |

Recorded usage is an exponential moving sum. The clock advances for the primary Open action and for Navigate into Folder, not while the extension is idle. Quick Look, Open With, copying, and Up record nothing. The score therefore adapts as new work replaces old work, without decaying because the user took time away.

The usage contribution passes through `log2`, so repeated opens give diminishing returns. History is capped at 2,000 paths, and entries whose decayed value falls below 0.01 are pruned.

In Usage mode, match tier comes before score, with learned query-to-item pairs ahead of textual matches, so a strong name match cannot be buried by an unrelated item's usage count alone. Within a tier, the combined score decides the order. Explicit Name, Date Modified, Date Created, and Size sorts bypass tier ordering and compare the selected field across admitted results. Ties use natural filename order, then the full path. A direct-child-only folder view has no positive depth below its scope, so the depth penalty is normally zero.

The approach draws on:

- [ze](https://github.com/jghub/ze) for an exponential moving sum on an event clock
- [zoxide](https://github.com/ajeetdsouza/zoxide/wiki/Algorithm) for ordered path terms
- [LaunchBar](https://www.obdev.at/resources/launchbar/help/AbbreviationSearch.html) for learned query-to-item pairs
- [fzf](https://github.com/junegunn/fzf) for positional match bonuses
- [fuzzy-file-search](https://github.com/raycast/extensions/tree/main/extensions/fuzzy-file-search) for multi-token path matching and `-d` / `-f`
- Everything and [Alfred File Filters](https://www.alfredapp.com/help/features/file-search/) for attribute-filter syntax

## Google Drive

Google Drive puts shortcut targets under `.shortcut-targets-by-id`. Discovery reads the mounted filesystem rather than depending on Spotlight's coverage of those paths.

fd always runs with `--follow`, independently of **Include Hidden Files**, which controls `--hidden` only. A visible Drive shortcut is therefore traversed even when it points into hidden `.shortcut-targets-by-id` storage, and its visible contents are indexed under the shortcut path. The shortcut itself is a row with `is_symlink = 1`, its visible `path`, and `storage_path` holding the resolved target, so a shared folder is findable by the name the user gave it in My Drive, and its contents by their own names. With hidden files off, hidden names inside linked folders are skipped and `.shortcut-targets-by-id` is not enumerated directly, so a target without a visible shortcut is not discovered. When the shortcut route and the direct target route are both indexed, they produce separate paths, and deduplication can collapse the aliases when filesystem identity is available.

Inside a shared folder, `useDirectoryListing` reads direct children only. Recursive crawling happens during manual rebuilds and nowhere else. Read failures are reported without discarding matches already found.

### Alias identity

A Drive shortcut and its resolved target have different paths but the same device and inode. Deduplication uses `dev:ino:name`, so identical routes collapse while a user-named shortcut can survive as a useful alternate result.

`Entry.storagePath` holds the canonical path when it resolves, including for entries under an aliased parent. Visit counts, pins, and learned-query lookups use that path, while the row still displays and opens the familiar shortcut path. Individual candidate validation resolves the full path. A folder listing resolves its parent once and reuses it for ordinary children, resolving individual symbolic links separately.

## Caches and storage

| Store                                   | Contents                                                 |
| --------------------------------------- | -------------------------------------------------------- |
| `visits` in LocalStorage                | Event clock and per-path usage records                   |
| `pins` in LocalStorage                  | Pinned paths                                             |
| `searches` in LocalStorage              | Recent queries                                           |
| `abbreviations` in LocalStorage         | Learned query-to-path pairs                              |
| `search-index-settings` in LocalStorage | Scopes, ignore patterns, and the three scan flags        |
| `recent-files` Cache                    | Legacy imported metadata, retained only for cleanup      |
| `usage-meta` Cache                      | Per-directory usage metadata from `mdls`                 |
| `file-index.sqlite` in the support dir  | The fd-built name index; hundreds of MB for a full Drive |
| Default Cache (`useCachedState`)        | `sort-mode` and `type-filter`; retained by data deletion |

`readUsageMetaResult` processes paths in batches of 25, four processes at a time, under one overall deadline. The helper defaults to 250 ms; the browser allows 3,000 ms for its nonblocking warmup of at most 50 uncached paths. If one path makes a batch fail, that batch is divided within its remaining budget to isolate the bad path, reading both halves together. The first batch that does not finish cleanly stops the pass, and batches that finished alongside it keep their metadata. The helper reports partial and error status, but the browser does not turn optional warmup failures into search failures. Query changes, scope changes, and unmount abort the warmup, and a storage-generation check prevents writes after deletion.

This `mdls` pass is the only Spotlight call. It supplements the extension's own usage history and the filesystem modification dates, because the fd-built index collects neither macOS use counts nor last-used dates. When the metadata is unavailable, the folder's entries are still listed and ranking uses the other signals. No Spotlight search is attempted.

**Delete All Data and Cache…** clears every LocalStorage key, the `recent-files` and `usage-meta` Cache namespaces, the legacy `discovered` and `shared-folders` namespaces, and the index database with its `-wal` and `-shm` files. It closes the cached read connection first, so a search running at that moment reports a missing index rather than reading an unlinked file. It removes those three paths by name and nothing else in that directory. It does not touch the default Cache used for type and sort choices, the extension preferences, the development diagnostic log, or any user file. Any new namespace holding search data has to be added to `eraseEverything` explicitly.

`clearLegacyCaches` exists so deletion can remove the `discovered` and `shared-folders` namespaces from installations that still have them. Nothing writes to either. Delete that module once no install carries them.

### Lock recovery

All indexing entry points hold one `proper-lockfile` lock in Raycast's support directory for the whole of scanning and saving. Data deletion holds it too. A competing request reports that the data is busy without reading or changing the stores. The heartbeat runs every second. A lock older than ten minutes can be recovered only when its recorded owner process is confirmed dead; a live or unknown owner keeps the exclusion. Each write checks ownership, and the lock is released when the operation finishes or throws.

Deletion acquires the lock before reading or clearing any store, so an in-flight indexing run cannot write its results after deletion succeeds. A deletion attempted mid-rebuild changes nothing and reports that the data is busy. If the lock is busy, nothing is deleted. Both deletion entry points report success only after the locked operation returns its counts.

## Performance notes

An open folder listing uses eight independent workers and publishes its initial result once, with a 3,000-entry cap and a three-second deadline. Names are read with `opendir`, stopping one entry past the cap rather than buffering the whole folder, so the omission count is a lower bound. Enumeration order comes from the filesystem, and ranking sorts what was admitted. Typing filters the listing in memory. A filesystem watcher refreshes changed entries, and a five-second poll covers missed events. Only the initial read is pending: a refresh keeps the previous listing until its replacement is ready, and an unchanged read reuses the entire snapshot. Children and their frozen cached usage are prepared synchronously in the same render, without an effect that would hide rows, which is what stops a background poll from resetting the selection. Changing directory, changing hidden visibility, or refreshing starts a new subscription; closing one stops the watcher and the poll and discards unfinished results.

Filename sorting reuses one numeric `Intl.Collator`. Candidate metadata uses the `lstat` result directly for ordinary entries and follows the target for symbolic links. Cached-path checks and standard-location discovery run asynchronously, outside rendering, and cloud-location discovery has a one-second deadline. Starting candidates are pins, the 40 highest-scoring visited paths, and standard locations; validation returns at most 50 matches for the current query and type, so nonmatching pins cannot crowd out matching visits.

Scoped result merging checks the displayed scope and its asynchronously resolved path, so unrelated cached shortcuts stay out while canonical direct children stay searchable through an alias.

### Search latency (50 results, September 2026)

Read-only measurements over a 936,420-entry index on Apple Silicon, with Raycast's Node 22.22.2 and SQLite 3.51.2. Lookup samples use 25 repetitions, ranking 100. The first observation is included in p95 and also called out, and these are not controlled cold-disk tests. Queries and folder names are omitted for privacy.

| Stage                                                             | Observed time                                         |
| ----------------------------------------------------------------- | ----------------------------------------------------- |
| Coverage summary                                                  | 2.63 ms first; 0.015 ms median; 0.057 ms p95          |
| Global lookup: four selective queries                             | 0.10-1.02 ms median; 0.46-1.70 ms p95; 10-83 ms first |
| Broader lookup                                                    | 5.44 ms median; 6.06 ms p95; 201 ms first             |
| Broad lookup                                                      | 67.4 ms median; 118.3 ms p95; 921 ms first            |
| Ranking and capping 50 index candidates                           | 0.06-0.09 ms median                                   |
| Validation of 28 remembered paths                                 | 0.65 ms median; 3.11 ms first                         |
| Folder enumeration plus stats, 6-121 direct children              | 0.41-1.80 ms median; 0.98-39.5 ms first               |
| Query filtering, ranking, and capping those already-read children | 0.02-0.15 ms median                                   |

Live worker observations: about 46-57 ms for a global query, 12-20 ms for filtering an open folder, 43-75 ms for a folder transition, and 103-114 ms for a fresh default-screen load. Those measure worker input receipt, or location creation, through ready-result publication. They exclude native paint and do not establish a sub-100-ms guarantee.

The optional `mdls` pass costs roughly 73-497 ms for the tested folders, which is why it warms the cache only and stays off the publication path.

Cost tracks how many names match the prefix, not how many are indexed. A broad term has to visit every match before the 50 can be picked by recency, which is why it costs tens of milliseconds while a selective one costs under a millisecond. A first lookup in a fresh process adds a connection open of about 1.2 ms and a statement prepare of 0.05 ms. The very first access after a rebuild can reach 120 ms while pages are read from disk. A genuinely cold disk is untested, because clearing the page cache needs root.

Memory: 400 query-and-rank cycles produce no measurable heap growth, at 113 MB resident. In the React harness, 200 searches stay under the 64 MB bound, and 120 folder transitions each carrying a query grow the heap by 1 MB.

The target is **under 100 ms from the last input to visible results**. The native throttle adds about 250 ms before worker processing, to prevent lost keystrokes, so the extension does not meet that target. The function timings above exclude native rendering, and broad matches and cold storage add more. Use the development timing events plus a live Raycast check, and do not present SQLite or worker timings as end-to-end UI latency.

### Indexing cost

Indexing two Google Drive accounts from the default home scope, warm mounts, Apple Silicon:

| Measurement      | Value                         |
| ---------------- | ----------------------------- |
| Entries indexed  | 936,166                       |
| Wall clock       | 27.8s, about 30,000 entries/s |
| Database on disk | 719 MB                        |

Where the time goes: fd emits 789,000 paths in 2.3s, so the crawl is about 4% of a scan, and the `lstat` pass runs at roughly 90,000/s. The rest is insertion, which is why the FTS triggers are suspended for the duration: 200,000 rows take 8.7s with them and 4.6s without, plus 0.4s to rebuild the whole index afterwards. Over 815,000 entries that is the difference between 56.4s and 27.2s.

Two settings dominate the total. With hidden files off, the default home scope is 936,166 entries at 27.8s; with them on it is 1,456,562 at 41.2s, because the extra half million are language and editor caches in dot-directories. `~/Library/Containers` and `~/Library/Daemon Containers` hold 4.5 million entries between them, an order of magnitude more than every document the user owns, so both are excluded.

`npm run harness:live` measures the current machine. It builds a capped index over one real Drive root and queries it. File Provider mounts, disk size, and permissions change timings substantially, and a cold cloud-backed scan can take minutes.

## Keyboard shortcuts

Result menus start with Open (Open in Finder for a folder), Show in Finder, Quick Look, and Open With, matching File Search. Keep Show in Finder second: Raycast assigns `⌘↩` to that position whatever explicit shortcuts later actions carry. Folder navigation follows in its own section.

Order matters on the empty list too, because whatever comes first is what Return invokes. `NavigationActions` renders nothing at the top level, where there is no parent to go up to and no start to return to. When the index is missing or unreadable, `Rebuild Search Index` comes first, matching the instruction the empty view displays. The harness evaluates that panel from source in both states and checks the first action carrying an `onAction`.

Shortcuts are declared in `src/components/row.tsx`, `navigation-actions.tsx`, `hidden-files-action.tsx`, `search-history-actions.tsx`, and the empty view in `browser.tsx`. Navigation, hidden-file visibility, and query-history actions are shared between empty and populated result lists, including the default native root.

These use Raycast's common shortcuts: Navigate into Folder (`Common.MoveDown`), Go to Parent Folder (`Common.MoveUp`), Quick Look, Pin, Copy Path, Copy Name, Copy File, Refresh, and Remove Search Scope in the settings editor. Open With uses `Common.Open` (`⌘O`) rather than `Common.OpenWith`, to match File Search. Show in Finder (`⌘↩`), Toggle Hidden Files (`⇧⌘.`), and Move to Trash (`⌃X`) have explicit bindings. `⌘P` is Raycast's own shortcut for opening the dropdown, which here holds the combined type and sort menu.

The explicit bindings are:

| Shortcut    | Action                                        |
| ----------- | --------------------------------------------- |
| `⌘↩`        | Show in Finder                                |
| `⇧⌘.`       | Toggle hidden files                           |
| `⌃X`        | Move to Trash                                 |
| `⌘[` / `⌘]` | Previous / next query                         |
| `⇧⌘H`       | Return to Everywhere with an empty query      |
| `⌘I`        | Toggle details                                |
| `⌥⌘A`       | Learn the current query for the selected item |
| `⇧⌘R`       | Rebuild Search Index                          |
| `⌥⌘R`       | Reset one usage record                        |

The [README table](README.md#keyboard-shortcuts) lists every binding a user sees, including the ones the common shortcuts resolve to. Raycast's list navigation keeps the bare arrows, `⌥↑` / `⌥↓`, and `⌘↑` / `⌘↓`. Do not reuse them for query history.

## Tests

Run the deterministic suite:

```bash
npm run harness
```

It uses temporary synthetic files and directories. It covers the README query examples, ranking, exponential decay, progress and failure states, path handling, symlink identity, overlapping indexing, index preservation, directory freshness, process cancellation, and hidden entries. The React checks cover controlled input updates, first-row focus, selection restoration, bounded rendering, and independent persisted type and sort choices. The dropdown check confirms that changing the type keeps the selected value among the registered menu items. None of these enumerate or print the user's files, and none replace live Raycast UI checks.

Use synthetic names, paths, and `example.com` accounts in fixtures, comments, documentation, and screenshots. Report live benchmark results with generic query labels, counts, and timings. Do not copy personal filenames, account identifiers, or search terms into the repository.

Several checks compile a span of a shipped component and run it with stubbed dependencies, which is the only way to reach logic inside a React body. `harness/source-slice.ts` anchors those spans on declaration and comment text and throws when an anchor no longer matches, so editing that text produces a failure rather than an assertion that holds vacuously. Editing comments in `src/components/browser.tsx` can therefore break the harness.

`harness/index-checks.ts` covers the index:

- fd discovery across install locations, an absolute preference, and a missing binary
- MATCH construction: FTS operators, quotes, punctuation-only terms, and the three-character policy
- hostile queries that must return nothing without raising
- schema creation, corruption recovery, and version-mismatch rebuild
- the fd argument array, NUL framing split across chunk boundaries, and names containing quotes and tabs
- refresh semantics: a complete scan removing stale rows, a partial scan merging, and failed, cancelled, time-limited, unavailable, and disappeared roots preserving
- root normalization, and fd's canonicalization of the root it is given
- a root dropped from the configuration, and an incomplete rescan leaving it alone
- every filter in SQL, symlink `storagePath`, truncation reporting, and the 50-candidate budget
- coverage reporting that does not count the full file table, and index stats counting each row once with the scan duration round-tripping
- a reader querying while a writer holds a transaction
- search, refresh, and deletion contending for one exclusion lock, and deletion leaving a real file in the same directory untouched
- a real fd crawl over a tree with a symlink loop, a broken link, a hidden directory, and `node_modules`
- settings parsing, including unparseable values, wrong-shaped values, missing fields, and dirty lists
- scope and pattern editing, with duplicates, bounds, relative paths, and built-in patterns
- configured settings reaching the real fd argument array, through `rebuildIndex`

`harness/performance-checks.ts` covers bounded asynchronous directory reads, metadata parity, watcher and polling freshness, unchanged snapshot identity, cancellation, and scan subprocess cleanup. `harness/folder-usage-checks.ts` confirms that optional usage reads never block the initial list, that late metadata stays out of the current query, and that successful negative reads do not starve later candidates.

Live diagnostics are explicit:

```bash
npm run harness:live
npm run harness:live -- /folder/to/check
```

Live mode checks macOS metadata and detected cloud locations. It also builds a capped index over one real Drive root with real fd and queries it, including a check that a file outside the indexed scope is absent. Output is limited to generic labels, counts, and timings, so paths and filenames are not printed. Results depend on permissions and the available cloud providers, and are diagnostic rather than release-blocking.

Before submitting a change, run:

```bash
npx prettier --check .
npm run typecheck
npm run harness
npm run lint
npm run build
```

## Store release

The manifest author must be the Raycast handle `raycast_file_search`. Keep the icon a 512 × 512 PNG and the screenshots 2000 × 1250 PNGs. Check every screenshot for personal paths, filenames, and account labels before publishing.

Capture screenshots from the current build, including the combined type and sort dropdown and the current action shortcuts. Use one background and theme throughout. Do not submit captures that show different bindings or status text.

Update `CHANGELOG.md`, then run the verification commands above. Publish with:

```bash
npm run publish
```

Then open the distribution build in Raycast and check search, folder navigation, the keyboard shortcuts, and the file-opening actions. Run **Rebuild Search Index** there and confirm that `node:sqlite` loads in Raycast's runtime, that the toast reports counts and elapsed time, and that searching stays usable while the scan runs. Keep `@raycast/api` current and commit the updated lockfile. Running the publisher again updates the existing PR; check its submitted files, complete the description and screenshots or screencast, then mark it ready for review.

Two live-test caveats still need attention: recheck Escape after returning from a folder, and do not claim a universal sub-100-ms response time, because broad queries and cold startup exceed it in the recorded measurements. Passing the harness establishes neither native exit behaviour nor input-to-paint latency, and local checks do not guarantee Store acceptance.

Raycast's publisher authenticates with GitHub and opens a pull request against the public extensions repository. See the official guides for [preparing an extension](https://developers.raycast.com/basics/prepare-an-extension-for-store), [contributing](https://developers.raycast.com/basics/contribute-to-an-extension), and [publishing](https://developers.raycast.com/basics/publish-an-extension).
