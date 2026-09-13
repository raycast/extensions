# Development notes

This document covers the implementation details needed to maintain and release File Search by Usage.

## Project layout

```text
src/search.tsx              whole-disk search command
src/index-shortcuts.tsx     manual Google Drive indexing command
src/populate-recents.tsx    opt-in recent-file import command
src/delete-data.tsx         standalone data-deletion command
src/components/browser.tsx  shared search and navigation view
src/components/hidden-files-action.tsx  shared hidden-file toggle action
src/components/row.tsx      result row and action panel
src/components/search-options.tsx  independent type and sort choices in one dropdown
src/components/native-search-navigation.tsx  bounded native root and active search route
src/components/search-screen.tsx  per-route query owner and result prop store
src/components/use-folder-selection.ts  initial focus and selection restoration
src/components/use-event-handles.ts  stable callbacks released on view unmount
src/components/setup-actions.tsx  shared setup, skip, and stop actions
src/components/use-directory-listing.ts  watched folder-listing subscription
src/components/use-search-setup.ts  command-owned setup and recent-file seed
src/components/use-recent-files.ts  active-folder recent-result filtering and validation
src/lib/recent-files.ts     bounded recent-document and parent-folder scan
src/lib/recent-setup.ts     setup choice, recent cache, and locked import
src/lib/search-setup.ts     sequential recent/Drive setup and independent skip choices
src/lib/setup-progress.ts   phase messages and elapsed-time heartbeat
src/lib/drive-setup.ts      shared Drive indexing workflow and setup completion
src/lib/drive-reads.ts      cancellable Drive reads with a shared physical-read limit
src/lib/recent-validation.ts  shared bounded pool for recent-result metadata
src/lib/bounded-reads.ts    physical read limits and removable cancelled waiters
src/lib/work-queue.ts       independent workers and cancellation-aware backpressure
src/lib/storage-lock.ts     short storage transactions and reset generations
src/lib/owned-lock.ts       ownership-checked lock acquisition and cleanup
src/lib/query.ts            parsing, filters, and match tiers
src/lib/score.ts            ranking weights
src/lib/result-order.ts     Usage and explicit sort comparators
src/lib/display-rows.ts     bounded rendering with selection retention
src/lib/folder-navigation.ts  active folder and obsolete-callback guards
src/lib/search-limits.ts    live discovery, ranking, and display limits
src/lib/history.ts          exponential usage history and abbreviations
src/lib/read-dir.ts         directory reads, path helpers, and cloud locations
src/lib/directory-listing.ts  asynchronous metadata reads, watching, and polling
src/lib/name-order.ts       shared numeric filename collation
src/lib/spotlight.ts        mdfind search and mdls usage metadata
src/lib/walk.ts             streaming live and bounded fallback directory walks
src/lib/drive-shortcuts.ts  Google Drive shortcut scan
src/lib/shared-scan.ts      Google Drive shared-folder scan
src/lib/index-refresh.ts    complete replacement, partial union, and failure preservation
src/lib/indexing-lock.ts    cross-process exclusion for indexing and deletion
src/lib/store.ts            LocalStorage persistence
src/lib/*-index.ts          cached indexes
src/lib/progress.ts         search-stage model
harness/rank-harness.ts     synthetic tests and opt-in live diagnostics
harness/performance-checks.ts  freshness, cancellation, and ordering regressions
harness/indexing-checks.ts  index preservation and indexing/deletion overlap tests
harness/recents-checks.ts   recent imports, query matching, and stalled metadata
harness/live-search-checks.ts  streaming, large listings, and stalled reads
harness/browser-checks.ts  browser cancellation, merging, and storage races
harness/sort-checks.ts     dropdown state, stable values, and persisted choices
harness/type-filter-checks.ts  type filtering and query-directive precedence
harness/search-screen-checks.ts  controlled-input commits during live updates
harness/folder-selection-checks.ts  initial focus and restored selections
harness/navigation-memory-checks.ts  native route bounds, cleanup, setup continuity, and root input
harness/navigation-stack-checks.ts  active folder transitions and stale-callback guards
```

The filesystem scans do not import `@raycast/api`, which lets the harness exercise them outside Raycast.

## Search pipeline

The UI deliberately separates fast local work from slow macOS metadata queries.

1. Load usage history and pins. These are the only stores that hold back the first useful frame.
2. Show direct folder children, cached usage metadata, standard locations, remembered Spotlight paths, learned queries, and cached Google Drive entries. Imported recent files load independently and join these results after their paths are checked.
3. In Everywhere, after a 420 ms pause in typing, ask Spotlight for the longest query token. For an alphanumeric token, follow the ordinary name search with a broader fuzzy-candidate pass.
4. Stream paths as Spotlight returns them. Rank each arriving batch, validate candidates asynchronously, and apply type, size, and date filters using their metadata.
5. Read Spotlight usage metadata in batches and merge it into the same ranked list while discovery continues.

Global Spotlight name search starts when the longest name term has at least three characters. Folder-scoped queries filter direct children at any query length. They do not start Spotlight name searches, recursive walks, matching-directory expansion, or hidden-root expansion. Direct-child usage metadata is still read. Cached candidates are restricted to immediate parents before validation, and the final ranker applies the same boundary to every source, including late results and canonical paths through symlinks.

Live search has no whole-query time cutoff, but has hard memory limits in `src/lib/search-limits.ts`: 500 retained live matches, 100 displayed rows, 500 returned entries per cached source, 5,000 scheduled discovery candidates, 1,000 recursive directories, and 100,000 raw Spotlight paths across both passes. Spotlight also caps accepted paths at 5,000 even if a caller requests more. Reaching a collection limit preserves existing results and reports partial coverage; the display cap has its own status message.

The 500-result limit applies to the final ranked list and the live discovery map; it is not a limit on all entry objects in memory. A folder listing can retain 3,000 children, each cached source can return 500 entries, and the command-owned recent seed can hold 10,000 entries. The saved indexes have their own limits below. Navigation keeps only one result view mounted, rather than retaining these arrays for each visited folder.

Spotlight output is decoded as a NUL-delimited UTF-8 stream and delivered in batches of up to 60 paths. Eight independent validation workers let healthy files appear while another file is slow. The validation and usage queues apply backpressure to the producer. Result snapshots are throttled to 100 ms; rejected fuzzy candidates do not enter the metadata queues.

Changing the query cancels its `mdfind` process, pending `mdls` enrichment, and queued validation. Folder navigation cancels the old scope and unmounts its result view; each destination starts with a blank query. Cancelled work cannot publish late results. Selection, Quick Look, details, and window visibility do not cancel a search. The 420 ms debounce still limits how often a new Spotlight search starts.

`NativeSearchNavigation` uses Raycast's Navigation API with at most two routes: a lightweight empty root and one active search view. Each folder transition pops the old view before pushing its replacement, giving Raycast fresh native selection and scroll state without accumulating screens. The pop callback schedules owner updates in a microtask because Raycast invokes it inside a state updater. `FolderNavigation` stores only the active folder, its numeric ID, and any requested initial selection; it keeps no folder history. Fresh IDs reject old callbacks even after revisiting the same folder. Unmounting runs search, watcher, timer, and validation cleanups, making previous results eligible for garbage collection. `⌥⌘↑` requests selection of the folder just left. Native Back returns to the empty root and invalidates the old frame; typing there opens a fresh Everywhere search after 250 ms of inactivity, while Return starts immediately with the entered query.

**Return to Start** (`⌘⇧H`) resets `FolderNavigation` to a new global frame, clears the query and selection, and cancels the previous scope before replacing the native search route. The setup task, session hidden-file state, and cached sort/type choices survive. Stale reset callbacks are ignored. The action is available from result rows, setup, and empty lists, except at the already-empty global screen. Bare Escape remains host-controlled; native Back returns to the lightweight root rather than restoring an old folder.

An empty query on the active Everywhere route still shows its initial results and any offered setup row; it is distinct from the empty root. The root exposes only Start Search and a text field, with no result rows, setup controls, or type/sort dropdown. Setup remains owned by `Browser` and can continue there; Return opens a results route where Stop Setup is available. Return passes the current root text, including when pressed before the 250 ms timer fires. Details visibility and the query-history cursor are per-result-view state and reset on a route replacement; saved queries, type/sort choices, and session hidden-file visibility survive.

`useSearchSetup` lives in the command owner and survives every folder transition. `useRecentFiles` filters and validates the shared recent-file seed only for the active result view. Setup progress and completion reach the current folder without keeping an old result view mounted; closing the command cancels setup.

`SearchScreenView` keeps the native `List` mounted within one route while its result producer publishes props through `SearchScreenContent`. Each route owns a new `SearchScreen`; cleanup drops its rows and callbacks. A separate small renderer store passes the latest session settings and setup state into the pushed route, without capturing obsolete session snapshots. Native event handlers use `useEventHandles`: the controls receive small stable functions whose targets are cleared when their result view unmounts. This prevents React DevTools' retained control props from keeping the old view's index arrays alive. Row setup props include only setup state and actions, never the recent-file seed or result arrays.

`SearchScreen` owns query text separately from releasable result props, so React's development-mode effect replay cannot erase an initial query. Input events update it synchronously, in the same batch as Raycast's input-event counter. The result view subscribes with `useSyncExternalStore`; result publications preserve the text instead of writing back an older copy. Query-history changes use the frame-checked setter, and each folder route starts with empty text. Result-only publications do not rerender the query consumer. The harness covers rapid typing, backspace, stale publications, root typing and Return, effect replay, and 120 folder transitions with at most two routes and one mounted result view.

When `environment.isDevelopment` is true, the extension logs navigation transitions, result-view lifetimes, requested and reported selection positions, heap usage by space, and active resource counts. Samples contain counts and IDs, not filenames or paths. They appear in the development console and in `raycast-file-search-navigation.log` in the macOS temporary directory, bounded to roughly 256 KB. Post-unmount samples run after one second; garbage collection is controlled by the worker, so these samples do not imply immediate reclamation. Diagnostics are disabled when `environment.isDevelopment` is false; a locally installed build can still run in development mode.

Shared cancellation signals belong to query and navigation events. Each effect owns the cleanup of its own work, so React's development-mode startup replay cannot disable later searches. An edit revision restarts a cancelled search even when rapid edits return to the same query before React renders.

The list renders at most 100 rows, including any retained selection. The pure `displayRows` helper keeps the first 100 ranked results, replacing the last row with the selected item when it falls outside that subset. This preserves order without mounting intervening rows. Action menus and detail panels are separate components: Raycast mounts them only for the selected item, so other rows do not build those trees. The harness checks these allocations and verifies that actions and details follow selection changes. Ordinary native selection notifications update a ref, not React state; only establishing or releasing initial focus changes selection state. There is no pagination state or load-more callback; collection does not depend on scrolling. Live folder walks have no time or depth cutoff, but share the directory ceiling and honor their result limit. Independent directory workers share a physical-read limit of eight, and overlapping expansion roots share a visited set. Recursive queues can hold at most the bounded set of admitted directories. Setup retains its separate limits.

### Completion state

`src/lib/progress.ts` defines four stages: memory, folder, Spotlight, and ranking. Every stage is `done`, `running`, `waiting`, `skipped`, `partial`, or `failed`. The progress bar, colored status light, and section heading all derive from this object. The heading combines a shortened location, count, and status in one text field; it does not use a wrapping subtitle. Long paths show their final two components, capped at 40 characters. Sorting remains visible in the dropdown.

A search is fully complete only after every applicable stage is done or skipped. A partial stage takes precedence over pending stages in the status light, so orange can appear while other work is still running. A failed folder, Spotlight, or metadata stage takes precedence over both and uses red. Separate caveats do not determine the status light and can appear alongside green; these report:

- An incomplete Google Drive index
- A Google Drive shared folder being read directly because Spotlight has no index for it
- The 100-row display cap

Starting a new search clears pending usage metadata from the old one. Empty directories also finish their folder stage immediately.

Partially cached folders stay pending while usage metadata arrives. Live enrichment allows five seconds per 25-path batch; a timed-out batch is partial, and later batches still run. A source failure is classified after queued validation finishes: partial if usable results arrived, failed if none did. Search history and cached indexes load without delaying the first useful frame, but keep the status yellow until they finish.

### Selection while results reorder

Row IDs use `generation:path`.

The generation changes when normalized name terms, the effective type, or the scope changes. Initial selection is requested in an effect after publishing the rows; it does not depend on Raycast first reporting a selection. `BrowserView` supplies the highest-ranked `instantRows` path still admitted by the combined result cap, including direct folder listings. Selection waits until ranking data is loaded and the result view is active. While initial memory loading, cached-file validation, or directory enumeration is pending, one 200 ms timer gives the memory list time to fill in. Completed checks end the wait early. When only Spotlight rows are available, the timer runs for the full 200 ms from their first appearance. Further batches do not restart it; at the deadline the latest committed memory candidate takes priority over the top Spotlight row. Slow metadata validation or ongoing setup cannot extend this wait. The chosen path is then published within the 100-row display before a subsequent commit requests focus, even when an earlier native selection was elsewhere.

The chosen path is retained across reranking. Changing the query rearms initial selection and cancels the old timer; leaving the view also clears it. Repeated acknowledgements do not trigger renders. A native move after the requested row is acknowledged releases controlled selection. During the settling wait, the first native report is treated as automatic restoration; a subsequent different valid row is treated as user navigation and cancels automatic focus. Raycast does not identify the source of selection events, so this boundary still requires live UI testing. Up retains priority for the folder just left and releases its request when acknowledged. Late automatic reports rearm unacknowledged requests without changing their target. If Raycast reports no selection or the automatic target disappears, focus is rearmed after rows are available. Rearming briefly releases the controlled ID before requesting it again. Requests cannot select a target excluded by the effective filters or absent from the retained results. After the user takes control, the highlight follows the selected file during reranking as long as it remains among the retained results. The bounded display includes that file without rendering all intervening rows.

## Query matching and filters

`SearchOptions` groups type and sort choices in one dropdown. `sort-mode` and `type-filter` use separate `useCachedState` keys. The selected sort item includes the effective type in its title so the closed dropdown shows both settings. Item values stay fixed when either setting changes; replacing a selected value can make Raycast fall back to All Types. Change handlers ignore echoed values. Query directives override the saved type through `parseQuery`'s default-type argument; the original query text and learned-query key remain unchanged.

The effective type is passed to cached-entry validation before its result cap and checked again during final ranking, including learned and path-bar matches. Changing the effective type cancels the obsolete query and resets row IDs without restarting the folder watcher. Empty-query recent-file selection still includes only genuinely recent entries. Path-bar parsing runs only in Everywhere and treats the text as a path, not a name query with appended directives.

The list disables Raycast's built-in filtering because it would replace the extension's ranking. `src/lib/query.ts` assigns these match tiers:

| Tier | Match                                                            |
| ---: | ---------------------------------------------------------------- |
|  -10 | Learned query-to-item pairing                                    |
|    0 | Name prefix                                                      |
|   10 | Prefix of a word in the name                                     |
|   20 | Name substring                                                   |
|   30 | Name subsequence                                                 |
|   40 | Every token appears, but the best match is in the enclosing path |
|   50 | Tight whole-path subsequence                                     |

Match tiers are separated by 10. `ORDER_PENALTY` adds 5 when terms appear in a less natural path order, preserving the match while ranking the ordered form first.

Filename subsequences allow arbitrary gaps. Only the whole-path fallback requires at least four query characters and a span no longer than three times the query length. Positional quality affects the score within a Usage tier, not whether a filename subsequence is admitted. Learned pairings bypass textual and extension matching, but still pass type, size, and modification-date checks.

Spotlight accepts one name term. The longest token is used, with a tie going to the later token because queries are commonly typed as folder then item. Remaining terms and all attribute filters are applied after paths return.

For alphanumeric terms, the second pass asks for filenames containing every distinct query character. `matchTier` then checks character order before any filesystem metadata reads. Results from both passes are deduplicated and share the caller's collection limit and cancellation signal. Only letters and numbers enter the generated predicate; punctuation stays in the ordinary literal-name request. The broader pass can be substantially slower than the first, but does not delay its results.

Supported filters are:

- `-d` and `-f`, with `^` and `:` aliases; directory words are `d`, `dir`, `directory`, and `folder`, and file words are `f` and `file`
- `ext:` with repeated, comma-separated, and multi-part extensions
- `after:` and `before:` with validated calendar dates
- `size:` with `b`, `kb`, `mb`, or `gb`
- A leading dot for hidden entries

`-f` and `size:` exclude folders. `ext:` is a name-suffix check, so a folder named `foo.pdf` can match `ext:pdf` unless File or `-f` is also selected. All three filters enable matching-folder expansion in Everywhere: when Spotlight returns a matching folder, `listUnder` reads beneath it so a query such as `foo ext:pdf` can find PDFs there. This walk is breadth-first and bounded by collection limits. Inside a folder, filtering stays limited to direct children.

Spotlight does not reliably index hidden content. In Everywhere, a dot-prefixed term such as `.config editor` turns matching hidden folders in the home directory into walk roots. A bare `.` lists hidden entries in the current scope. Inside a folder, dot-prefixed queries filter its direct children without walking below them; enter a hidden folder or use the path bar to browse it.

`Browser` initializes hidden-file visibility from the `showHidden` preference and keeps the toggle state for the command's lifetime, across folder changes. It is not persisted. Effective visibility is the session choice OR the parsed query's hidden flag. Changing it restarts directory reads and discovery; each effect cancels its previous work. Cached dot-prefixed rows are filtered at ranking time too. Explicit path-bar targets remain accessible. The shared toggle action is available on result rows, the setup row, and empty lists. This controls dot-prefixed names, not Finder's separate hidden-file attribute.

Filter-only whole-disk searches do not launch Spotlight. Asking for every file of a common extension can exceed the result cap before ranking. Include a name term for a full-disk filtered search.

## Ranking

The main weights live together in `src/lib/score.ts`.

| Signal                         |        Weight | Decay                                  |
| ------------------------------ | ------------: | -------------------------------------- |
| Recorded opens                 |           100 | 120-action half-life on an event clock |
| Modification time              |            40 | 14-day wall-clock half-life            |
| Spotlight usage metadata       |            25 | 30-day wall-clock half-life            |
| Positional name quality        |            30 | None                                   |
| Depth below the current folder | -12 per level | None                                   |

Recorded usage uses an exponential moving sum. The clock advances for the primary Open action and Navigate into Folder, not while the extension is idle. Quick Look, Open With, copying, and Up do not record a visit. The score therefore adapts as new work replaces old work without decaying simply because the user took time away.

The usage contribution passes through `log2`, giving repeated opens diminishing returns. History is capped at 2,000 paths and entries whose decayed value falls below 0.01 are pruned.

In Usage mode, match tier comes before score, with learned query-to-item pairs ahead of textual matches. A strong name match cannot be buried solely by an unrelated item's usage count. Within the same tier, the combined score decides the order. Explicit Name, Date Modified, Date Created, and Size sorts bypass match-tier ordering and compare the selected field across admitted results. Ties use natural filename order, then the full path. The current direct-child-only folder view has no positive depth below its scope, so the depth penalty is normally zero.

The approach draws on:

- [ze](https://github.com/jghub/ze) for an exponential moving sum on an event clock
- [zoxide](https://github.com/ajeetdsouza/zoxide/wiki/Algorithm) for ordered path terms
- [LaunchBar](https://www.obdev.at/resources/launchbar/help/AbbreviationSearch.html) for learned query-to-item pairs
- [fzf](https://github.com/junegunn/fzf) for positional match bonuses
- [fuzzy-file-search](https://github.com/raycast/extensions/tree/main/extensions/fuzzy-file-search) for multi-token path matching and `-d` / `-f`
- Everything and [Alfred File Filters](https://www.alfredapp.com/help/features/file-search/) for attribute-filter syntax

## Google Drive workaround

Google Drive places shortcut targets under `.shortcut-targets-by-id`. Spotlight may catalog neither the shortcut nor the target contents.

The **Index Google Drive** command performs two bounded scans:

- `scanShortcuts` records symbolic links and the names shown in My Drive.
- `scanSharedFolders` records paths inside shared folders.

Both scans report progress after each breadth-first level. Setup and the standalone command merge readable checkpoints into the last successfully saved index and mark them partial. Unavailable or failed checkpoints do not change storage. Cancellation blocks subsequent writes but retains successful checkpoints. A bounded scan records whether it reached its time, depth, or item limit, and the UI reports that reason. Older saved indexes without a reason use a neutral “stopped early” message. Indexing runs only when the user starts setup or Index Google Drive; there is no scheduled scan.

First-run setup allows ten minutes per Drive scan. The standalone command uses four minutes for shortcuts and two minutes for shared-folder contents. Both use the scanners' default `maxDepth = 8` for shortcuts and `maxDepth = 6` for shared folders. The action-panel Index Google Drive action allows twenty seconds per scan and uses `maxDepth = 6` for both, without saving intermediate checkpoints. Shared-folder scans collect at most 40,000 paths per scan; merging discoveries across runs can retain more within the storage byte limit. Deadlines and cancellation interrupt the caller's wait, including during root discovery. A shared pool caps outstanding Drive filesystem reads at eight per runtime; retries reuse pending reads for the same path and operation. Physical provider reads may finish later, but cancelled scans cannot start further reads or publish checkpoints.

All indexing entry points hold the same `proper-lockfile` lock in Raycast's support directory throughout scanning and saving. Data deletion holds this lock too. A competing request reports that the data is busy without reading or changing the stores. The lock heartbeat runs every second. A lock older than ten minutes can be recovered only when its recorded owner process is confirmed dead; a live or unknown owner stays protected. Each write checks ownership, and the lock is released when the operation finishes or throws.

Each scan also reports whether every traversed Drive directory remained readable. An unavailable result, an explicit scan error, or a thrown scan failure leaves the last successfully saved index intact, even when that index is empty. Successful checkpoints saved before a later failure remain available.

`refreshShortcutIndex` and `refreshSharedIndex` implement the same policy: complete readable scans replace; partial readable scans merge; unavailable or failed scans preserve. Shared paths are deduplicated by exact path. Shortcuts are keyed by their visible `path`, with new observations updating the name and target for that path; distinct aliases to the same target remain distinct. A partial union keeps the incoming scan's timestamp, partial flag, and limit reason, even if the previous index was complete. Only a complete scan may remove paths, including by replacing the index with an empty one. Deleted paths can therefore remain indexed until a complete scan. Setup, standalone indexing, checkpoints, and action-panel refresh use these helpers. The browser publishes successfully saved merged entries and metadata, and refresh notices report merged counts rather than raw scan counts.

The shortcut index and shared-folder cache each allow 8,000,000 serialized UTF-8 bytes. Both save functions check capacity before writing and return failure on storage errors. This preflight also prevents Raycast's shared-cache eviction policy from removing an oversized replacement and the old entry. An oversized union or replacement is rejected without truncation; the last saved index stays intact. Setup and standalone indexing stop and report a save failure, including when a checkpoint cannot be saved. The action-panel refresh does not display an unsaved index as a successful refresh. The two indexes are saved independently: a successful shortcut update can remain saved even if the subsequent shared-folder scan fails.

Inside an unindexed shared folder, `useDirectoryListing` reads only direct children; neither `walkSearch` nor `mdfind` is used for name discovery. In Everywhere, matching-folder expansion and hidden-folder searches use continuous `listUnder` traversal. Read failures are reported without discarding matches already found.

### Alias identity

A Drive shortcut and its resolved target have different paths but the same filesystem device and inode. Deduplication uses `dev:ino:name`, so identical routes collapse while a user-named shortcut can remain as a useful alternate result.

`Entry.storagePath` contains the canonical path when resolved, including for entries beneath an aliased parent. Visit counts, pins, and learned-query lookups use that path while the row continues to display and open the familiar shortcut path. Individual candidate validation resolves the full path. Folder listings resolve the parent once and reuse it for ordinary children, resolving individual symbolic links separately.

## First-run setup

The active Everywhere results view offers **Set Up Search** when its query is empty, until a setup run starts. The lightweight native root does not display setup controls. The `search-setup-run` marker is written under the indexing lock before scanning, separately from each step's completion state. Declining confirmation, skipping sources, or being blocked by the lock does not count as a run. Existing `done` or `partial` step markers also establish that setup has run. Active scans retain their progress row in Everywhere with an empty query; after they finish or stop, setup remains in Actions for result rows and empty result lists. Partial or unavailable scans stay retryable without restoring the main prompt. If no unfinished steps remain, the action confirms a refresh of both sources and marks those steps pending before scanning. Setup and indexing never start automatically; ordinary search still reads folders and metadata without setup. The standalone **Populate from Recent Files** and **Index Google Drive** commands remain available.

One indexing lock covers both setup steps and the transition between them. Setup captures the deletion generation before confirmation and checks it after acquiring the lock, so an old confirmation cannot recreate erased data. Closing the browser or choosing **Stop Setup** cancels the active scan and prevents the next step from starting. Recent-file checkpoints update the starting cache during import; Drive progress updates the setup row, and the browser reloads saved indexes when the run ends. A one-second heartbeat shows the phase, available counts, elapsed time, and phase budget without estimating a completion percentage. It stops in each helper's finally block. Recent imports distinguish time, document, parent-folder, per-folder, cache, and metadata limits in the final summary. Shortcut metadata is validated asynchronously for matching candidates, not synchronously for the whole new index.

The import queries `kMDItemLastUsedDate` over the preceding seven days with `mdfind`, restricted to the user's home folder and common document/content types. It considers at most 500 returned paths and sorts them by available last-used metadata. First-run setup selects up to 500 documents; the standalone import keeps its 200-document limit. Neither is guaranteed to include the most recent documents if Spotlight exceeds the candidate cap or metadata is missing.

Parent expansion is shallow. Setup allows 50 parent folders, 500 visible children per folder, and 10,000 total entries. The standalone import keeps its limits of 20 parents, 200 children per folder, and 3,000 entries per scan. Hidden and noisy paths are excluded, sibling symlinks are skipped, and resolved paths must remain within the home folder. Reads use batches of eight. First-run setup allows 60 seconds overall, including at most 15 seconds for Spotlight usage enrichment; the standalone recent-file import keeps its 15-second overall and 2.5-second metadata budgets. A shared import pool retains slots for unfinished filesystem reads across retries in the same runtime. Cancellation removes queued work and is checked between filesystem operations. Slow calls can finish later, but cannot publish or save results after the import stops. Checkpoints preserve progress.

Saving and loading share a 10,000-entry cache limit. Existing entries are loaded once under the indexing lock and merged into checkpoints, so a smaller standalone import does not shrink the cache to its per-scan limit. A 16 MB byte check rejects an oversized replacement before writing, preserving the previous saved results.

The recent-file cache is separate from recorded opens. Only documents returned by the recent query seed the empty-query list; parent folders and neighbors participate in typed searches. Name and path matching selects candidates first; type, size, and date filters run after metadata is refreshed. Each live cached source stops after 500 matching entries or after checking its candidates. The validator's bounded mode uses 60 results and one second by default; its uncapped continuous mode is not the browser's per-source limit.

A shared pool limits metadata validation to eight outstanding reads across cached sources and queries, publishing successful rows incrementally. After one second, unchecked imported rows can use saved metadata while live checks remain pending. A provider or permission error also allows cached metadata, but settles as partial. Paths confirmed missing stay out of the results. Path-only indexes have no metadata fallback. Cancelled callers detach their listeners and queued work without releasing slots still occupied by physical reads. They cannot publish late results. The normal match-quality and usage ranking still applies.

Imports, setup-choice writes, and deletion use the same cross-process lock as Google Drive indexing. Skipping a step does not start a scan. Deletion clears the setup-run marker, both step choices, and the recent cache; it never starts another scan.

Normal history and cache writes use a separate, short-lived storage lock, so importing does not block them. Deletion takes the indexing lock first, then the storage lock. Writers capture a reset generation before starting work and check it with lock ownership immediately before saving. Deletion changes that generation before clearing storage; queued or delayed work from an older generation is rejected. Browser storage loads also check the generation before updating the display. The random generation marker contains no user data. Both locks protect heartbeat, release, and process-exit cleanup against stale owners. Cache persistence runs independently of result display.

Each lock records a process ID and random owner ID. Unknown or legacy ownerless locks fail closed, as does a reused process ID. If one remains busy after restarting Raycast, verify that no extension command or recorded owner process is running before manually removing that specific lock directory. Never remove a lock just because its timestamp is old: a live writer may still be finishing a storage call.

## Caches and storage

| Store                                | Contents                                                      |
| ------------------------------------ | ------------------------------------------------------------- |
| `visits` in LocalStorage             | Event clock and per-path usage records                        |
| `pins` in LocalStorage               | Pinned paths                                                  |
| `searches` in LocalStorage           | Recent queries                                                |
| `abbreviations` in LocalStorage      | Learned query-to-path pairs                                   |
| `shortcuts` in LocalStorage          | Google Drive shortcut index                                   |
| `recent-files-setup` in LocalStorage | Completed, partial, or skipped recent-file setup              |
| `google-drive-setup` in LocalStorage | Completed, partial, or skipped Google Drive setup             |
| `search-setup-run` in LocalStorage   | Whether setup has started; controls the one-time main prompt  |
| `recent-files` Cache                 | Up to 10,000 imported paths and metadata; 16 MB capacity      |
| `shared-folders` Cache               | Paths inside shared folders; 8 MB capacity                    |
| `discovered` Cache                   | Up to 300 paths added per search; 20,000 paths; 4 MB capacity |
| `usage-meta` Cache                   | Per-directory Spotlight usage metadata                        |
| Default Cache (`useCachedState`)     | `sort-mode` and `type-filter`; retained by data deletion      |

`readUsageMetaResult` processes paths in chunks of 25. Its bounded default is 250 ms overall; continuous mode allows five seconds per chunk and publishes completed chunks as it proceeds. If one path makes a chunk fail, that chunk is divided within its remaining budget to isolate the bad path. Timeouts and mixed successes/failures are partial; process failures or malformed output with no successful batch remain errors. The `readUsageMeta` wrapper is available when a caller needs only the metadata map.

**Delete All Data and Cache…** clears all LocalStorage keys and the `discovered`, `shared-folders`, `recent-files`, and `usage-meta` Cache namespaces. It does not clear the default Cache used for type and sort choices, extension preferences, or the development diagnostic log. It does not delete user files. Any new namespace containing search data must be added explicitly to `eraseEverything`.

Deletion acquires the indexing lock before reading or clearing stores, so an in-flight indexing run cannot write its results after deletion succeeds. If the lock is busy, nothing is deleted. Both deletion entry points report success only after the locked operation returns its deletion counts.

## Performance notes

Open folder listings use eight independent workers and stream the initial results, with a 3,000-entry cap. Directory names are read with `opendir`, stopping after one overflow entry rather than buffering the entire folder. The omission count is therefore a lower bound, not a full count of skipped files. Enumeration order comes from the filesystem; ranking sorts the admitted results. Typing filters the existing listing in memory. Cached direct children can supplement it, but uncached children beyond the listing cap may be absent even when their names match. A filesystem watcher refreshes changed entries; a five-second poll covers missed cloud-provider events and unavailable watchers. Refreshes retain the previous listing until its replacement is ready. Changing the directory, changing hidden-file visibility, or pressing Refresh starts a new subscription. Closing the subscription stops the watcher and polling and discards unfinished results.

Filename sorting reuses one numeric `Intl.Collator`. Candidate metadata uses the `lstat` result directly for ordinary entries and follows the target for symbolic links. Cached-path checks and standard-location discovery run asynchronously, outside rendering. Standard cloud-location discovery has a one-second deadline. Starting candidates combine pins, the 40 highest-scoring visited paths, and standard locations; validation returns at most 500 matches for the selected type. Name filtering happens during final ranking. Learned abbreviations bypass textual matching when their paths are validated.

Storage identity resolves the entire path, including aliased parent folders. Directory listings resolve their parent once, rather than resolving each ordinary child. Scoped result merging checks both the displayed scope and its asynchronously resolved path, so unrelated cached shortcuts stay out while canonical direct children remain searchable through an alias.

Use `npm run harness:live` to measure the current machine. File Provider mounts, Spotlight state, disk size, and permissions can change timings substantially; a cold cloud-backed scan can take minutes.

## Keyboard shortcuts

Result menus start with Open (Open in Finder for folders), Show in Finder, Quick Look, and Open With, matching File Search. Keep Show in Finder second: Raycast assigns `⌘↩` to that position, regardless of explicit shortcuts on later actions. Folder navigation follows in its own section, with its existing `⌥⌘↓` and `⌥⌘↑` bindings.

Shortcuts are declared in `src/components/row.tsx`, `navigation-actions.tsx`, `hidden-files-action.tsx`, `search-history-actions.tsx`, and the empty view in `browser.tsx`. Navigation, hidden-file visibility, and query-history actions are shared between empty and populated result lists; the lightweight native root exposes only Start Search. Navigation into a folder, Up, Quick Look, Pin, Copy Path, Copy Name, Copy File, and Refresh use Raycast's common shortcuts. Open With uses `Common.Open` (`⌘O`), not `Common.OpenWith`, to match File Search. Show in Finder (`⌘↩`), Toggle Hidden Files (`⇧⌘.`), and Move to Trash (`⌃X`) use explicit bindings. `⌘P` opens the combined type and sort dropdown. See the [README shortcut table](README.md#keyboard-shortcuts) for the macOS bindings.

The custom bindings are:

| Shortcut    | Action                                        |
| ----------- | --------------------------------------------- |
| `⌘[` / `⌘]` | Previous / next query                         |
| `⌘⇧H`       | Return to Everywhere with an empty query      |
| `⌘I`        | Toggle details                                |
| `⌘⌥A`       | Learn the current query for the selected item |
| `⌘⇧I`       | Index Google Drive                            |
| `⌘⌥R`       | Reset one usage record                        |

Raycast's list navigation keeps bare arrows, `⌥↑` / `⌥↓`, and `⌘↑` / `⌘↓`. Do not reuse them for query history.

## Tests

Run the deterministic suite:

```bash
npm run harness
```

It uses temporary synthetic files and directories. It covers README query examples, fuzzy matching, ranking, exponential decay, progress and failure states, path handling, symlink identity, bounded walks, overlapping indexing, index preservation, directory freshness, process cancellation, hidden folders, and filter expansion. React tests cover controlled input updates, first-row focus, selection restoration, bounded rendering, and independent persisted type/sort choices. The dropdown regression checks that changing type keeps the selected value among already registered menu items. These tests do not enumerate or print the user's files; they do not replace live Raycast UI checks.

Live diagnostics are explicit:

```bash
npm run harness:live
npm run harness:live -- /folder/to/check
```

The live mode checks macOS metadata, Spotlight, detected cloud locations, and Drive scans. Its output is limited to generic labels, counts, and timings so paths and filenames are not printed. Results depend on permissions, Spotlight state, and the available cloud providers; they are diagnostic rather than release-blocking.

Before submitting a change, run:

```bash
npx prettier --check .
npm run typecheck
npm run harness
npm run lint
npm run build
```

## Store release

The manifest author must be the Raycast handle `raycast_file_search`. Keep the icon as a 512 × 512 PNG and screenshots as 2000 × 1250 PNG files. Review every screenshot for personal paths, filenames, and account labels before publishing.

Capture screenshots from the current build, including the combined type/sort dropdown and current action shortcuts. Use the same background and theme throughout. Do not submit older captures that show different bindings or status text.

Update `CHANGELOG.md`, then run the verification commands above. Publish with:

```bash
npm run publish
```

Before submitting, open the distribution build in Raycast and check search, delayed results, folder navigation, keyboard shortcuts, and file-opening actions. Keep `@raycast/api` current and commit the updated lockfile. Running the publisher again updates the existing PR; check its submitted files, complete the description and screenshots or screencast, and mark it ready for review after verification.

Folder transitions use the public Navigation API, with a bounded root-plus-active-route design to avoid retaining a growing stack of result views. Local checks do not guarantee Store acceptance; reviewers still need to assess the submitted extension and its user experience.

Raycast's publisher authenticates with GitHub and opens a pull request against the public extensions repository. See the official guides for [preparing an extension](https://developers.raycast.com/basics/prepare-an-extension-for-store), [contributing](https://developers.raycast.com/basics/contribute-to-an-extension), and [publishing](https://developers.raycast.com/basics/publish-an-extension).
