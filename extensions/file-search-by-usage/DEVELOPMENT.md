# Development notes

This document covers the implementation details needed to maintain and release File Search by Usage. Measurements are examples from one development machine; they are not performance guarantees.

## Project layout

```text
src/search.tsx              whole-disk search command
src/browse-finder.tsx       search scoped to the frontmost Finder folder
src/index-shortcuts.tsx     manual Google Drive indexing command
src/delete-data.tsx         standalone data-deletion command
src/components/browser.tsx  shared search and navigation view
src/components/row.tsx      result row and action panel
src/components/use-directory-listing.ts  watched folder-listing subscription
src/lib/query.ts            parsing, filters, and match tiers
src/lib/score.ts            ranking weights
src/lib/history.ts          exponential usage history and abbreviations
src/lib/read-dir.ts         directory reads, path helpers, and cloud locations
src/lib/directory-listing.ts  asynchronous metadata reads, watching, and polling
src/lib/name-order.ts       shared numeric filename collation
src/lib/spotlight.ts        mdfind search and mdls usage metadata
src/lib/walk.ts             bounded fallback directory walks
src/lib/drive-shortcuts.ts  Google Drive shortcut scan
src/lib/shared-scan.ts      Google Drive shared-folder scan
src/lib/index-refresh.ts    unavailable-index replacement policy
src/lib/indexing-lock.ts    cross-process exclusion for indexing runs
src/lib/store.ts            LocalStorage persistence
src/lib/*-index.ts          cached indexes
src/lib/progress.ts         search-stage model
harness/rank-harness.ts     synthetic tests and opt-in live diagnostics
harness/performance-checks.ts  freshness, cancellation, and ordering regressions
harness/indexing-checks.ts  command-level indexing overlap regressions
```

The filesystem scans do not import `@raycast/api`, which lets the harness exercise them outside Raycast.

## Search pipeline

The UI deliberately separates fast local work from slow macOS metadata queries.

1. Load usage history and pins. These are the only stores that hold back the first useful frame.
2. Show direct folder children, cached usage metadata, standard locations, remembered Spotlight paths, learned queries, and cached Google Drive entries.
3. After a 420 ms pause in typing, ask Spotlight for the longest query token.
4. Match and rank raw path strings, then call `stat` only for the top candidates that survive all filters.
5. Read Spotlight usage metadata for the shortlist and merge it into the same ranked list.

The global Spotlight threshold is three characters. Scoped search uses two because the current folder is already visible and the candidate set is smaller.

The shortlist is 60 entries. A broad three-character query can produce thousands of paths, so statting every Spotlight result would add cost without improving the visible list. Candidates are graded before the shortlist is taken; taking the first 60 paths in index order can discard the best match.

Replacing a search aborts its `mdfind` process and any pending `mdls` enrichment. Cancellation discards the obsolete result without showing a failure. The 420 ms debounce still limits how often a new Spotlight search starts.

### Completion state

`src/lib/progress.ts` defines four stages: memory, folder, Spotlight, and ranking. Every stage is `done`, `running`, `waiting`, `skipped`, `partial`, or `failed`. The progress bar, colored status light, and section subtitle all derive from this object.

A search is fully complete only after every applicable stage is done or skipped. An incomplete metadata stage settles as partial with an orange status. A failed folder, Spotlight, or metadata stage uses a red status. Separate caveats report:

- A walk stopped by its time, depth, or result bound
- An incomplete Google Drive index
- A Google Drive shared folder being read directly because Spotlight has no index for it

Starting a new search clears pending usage metadata from the old one. Empty directories also finish their folder stage immediately.

Partially cached folders stay pending while the bounded metadata pass runs. If its 250 ms deadline expires before every entry is processed, the entries already read are kept and the settled status turns orange. Search history and cached indexes load without delaying the first useful frame, but keep the status yellow until they finish.

### Selection while results reorder

Row IDs use `generation:path`.

The generation changes when the query or scope changes, which lets Raycast begin the new result set at the first row. Within one generation, the path remains stable. If delayed results reorder the list, the highlight follows the selected file instead of remaining at the same numeric position and selecting a different file.

## Query matching and filters

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

Spotlight accepts one name term. The longest token is used, with a tie going to the later token because queries are commonly typed as folder then item. Remaining terms and all attribute filters are applied after paths return.

Supported filters are:

- `-d` and `-f`
- `ext:` with repeated, comma-separated, and multi-part extensions
- `after:` and `before:` with validated calendar dates
- `size:` with `b`, `kb`, `mb`, or `gb`
- A leading dot for hidden entries

`ext:`, `-f`, and `size:` exclude folders. When Spotlight returns a matching folder, `listUnder` reads beneath it so a query such as `project ext:pdf` can find PDFs inside that folder. This walk is breadth-first and bounded.

Spotlight does not index hidden content. A dot-prefixed term such as `.config editor` turns matching hidden folders into walk roots. A bare `.` lists hidden entries in the current scope. Hidden-root discovery looks one level below the current scope; a deeper hidden folder remains reachable through the path bar.

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

Recorded opens use an exponential moving sum. The clock advances when the user opens something through the extension, not while the extension is idle. The score therefore adapts as new work replaces old work without decaying simply because the user took time away.

The usage contribution passes through `log2`, giving repeated opens diminishing returns. History is capped at 2,000 paths and entries whose decayed value falls below 0.01 are pruned.

Textual match tier comes before score. A strong name match cannot be buried by an unrelated item with a large usage history. Within the same tier, the combined score decides the order.

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

Both scans report progress after each breadth-first level. When no earlier index exists, these checkpoints provide a useful partial index. A bounded scan records whether it reached its time, depth, or item limit, and the UI reports that reason. Older saved indexes without a reason use a neutral “stopped early” message. Indexing runs only when the user starts the command, either from Raycast's root search or from a result's action panel.

The standalone command allows four minutes and eight levels for shortcuts, followed by two minutes and six levels for shared-folder contents. The action-panel version allows twenty seconds per scan and six levels, without saving intermediate checkpoints. These deadlines are checked between batches; an individual cloud-provider read can take longer.

Both entry points hold the same `proper-lockfile` lock in Raycast's support directory throughout scanning and saving. A second request reports that indexing is already running without reading or replacing the indexes. The lock heartbeat runs every second; a lock left by a crashed process expires after ten minutes. Each write checks ownership, and the lock is released when the run finishes or throws.

Each scan also reports whether every traversed Drive directory remained readable. If the drive is offline, unmounted, or fails during traversal, the refresh keeps the previous non-empty index rather than replacing it with an incomplete result.

Searching while already inside an unindexed shared folder uses `walkSearch` instead of `mdfind`. Folder expansion, hidden-folder walks, and this fallback all propagate truncation to the UI.

### Alias identity

A Drive shortcut and its resolved target have different paths but the same filesystem device and inode. Deduplication uses `dev:ino:name`, so identical routes collapse while a user-named shortcut can remain as a useful alternate result.

For a symbolic link, `Entry.storagePath` contains the resolved target. Visit counts, pins, and learned-query lookups use that storage path while the row continues to display and open the familiar shortcut path. Only symlinks require `realpath`, avoiding a resolution call for every ordinary result.

## Caches and storage

| Store                           | Contents                                                       |
| ------------------------------- | -------------------------------------------------------------- |
| `visits` in LocalStorage        | Event clock and per-path usage records                         |
| `pins` in LocalStorage          | Pinned paths                                                   |
| `searches` in LocalStorage      | Recent queries                                                 |
| `abbreviations` in LocalStorage | Learned query-to-path pairs                                    |
| `shortcuts` in LocalStorage     | Google Drive shortcut index                                    |
| `shared-folders` Cache          | Paths inside shared folders; 8 MB capacity                     |
| `discovered` Cache              | Paths returned by earlier Spotlight searches; capped at 20,000 |
| `usage-meta` Cache              | Per-directory Spotlight usage metadata                         |

`readUsageMetaResult` processes paths in chunks of 25 and has a 250 ms default deadline. Completed chunks are kept. If one path makes a chunk fail, the chunk is divided until the bad path is isolated; metadata from the other paths is retained and the result is partial. A timeout is also partial. A process failure affecting every path, or malformed output, remains an error. The `readUsageMeta` wrapper is available when a caller needs only the metadata map.

**Delete All Data and Cache…** clears LocalStorage and each Cache namespace for this extension. It does not delete files. Clearing the whole extension store avoids leaving behind a key added by a future version.

## Performance notes

Open folder listings are read asynchronously in batches of eight. Typing a filename prefix filters the existing listing in memory. A filesystem watcher refreshes changed entries; a five-second poll covers missed cloud-provider events and unavailable watchers. Changing the directory, changing hidden-file visibility, or pressing Refresh starts a new subscription. Closing it stops the watcher and polling and discards unfinished reads.

Filename sorting reuses one numeric `Intl.Collator`. Candidate metadata uses the `lstat` result directly for ordinary entries and follows the target only for symbolic links. Search tiers, score weights, and result limits are unchanged by these optimizations.

Representative measurements from one Mac:

```text
readdir + stat, 300 entries             3–5 ms
mdfind, six-character scoped query      about 0.8 s
mdfind, six-character global query      about 1.2 s
mdfind, three-character global query    about 1.6 s
shared-folder index, 7,648 paths        about 1.5 MB
warm shared-folder scan                 about 0.14 s
cold shortcut scan on a cloud mount     can take minutes
```

These numbers explain the architecture but should not be treated as fixed. File Provider mounts, Spotlight state, disk size, and permissions can change them substantially.

## Keyboard shortcuts

Shortcuts are declared in `src/components/row.tsx` and the empty view in `browser.tsx`. Use Raycast's common shortcuts for Quick Look, Open With, Pin, Copy Path, and Refresh where available.

The custom bindings are:

| Shortcut    | Action                                        |
| ----------- | --------------------------------------------- |
| `⌘→` / `⌘←` | Enter a folder / go to its parent             |
| `⌘[` / `⌘]` | Previous / next query                         |
| `⌘⇧F`       | Show in Finder                                |
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

It uses temporary synthetic files and directories. It covers query parsing, fuzzy matching, ranking, exponential decay, progress and failure states, path handling, symlink identity, bounded walks, overlapping indexing, index preservation, directory freshness, process cancellation, hidden folders, and filter expansion. It does not enumerate or print the user's files.

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

Update `CHANGELOG.md`, then run the verification commands above. Publish with:

```bash
npm run publish
```

Before submitting, open the distribution build in Raycast and check search, delayed results, folder navigation, keyboard shortcuts, and Finder permissions. Keep `@raycast/api` current and commit the updated lockfile. Running the publisher again updates the existing PR; check its submitted files, complete the description and screenshots or screencast, and mark it ready for review after verification.

Raycast's publisher authenticates with GitHub and opens a pull request against the public extensions repository. See the official guides for [preparing an extension](https://developers.raycast.com/basics/prepare-an-extension-for-store), [contributing](https://developers.raycast.com/basics/contribute-to-an-extension), and [publishing](https://developers.raycast.com/basics/publish-an-extension).
