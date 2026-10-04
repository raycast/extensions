# File Search by Usage Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Download the pinned fd 10.5.0 macOS release automatically when fd is not installed, verify its SHA-256 checksum and version, and reuse only an unchanged cached executable.

- Show the last index scan's start and end times, total duration, and phase-by-phase timing breakdown in Search Index Settings.

- Show the end of long result paths, with the full location available on hover.

- Count Open With, Show in Finder, and Copy actions as one use each, alongside Open and folder entry.

- Search the folders you choose and your own usage history in one ranked list.
- Match Raycast File Search shortcuts for Show in Finder, Open With, and Move to Trash; add a hidden-file toggle on `⇧⌘.` for the current command run.
- Order the first four actions as Open, Show in Finder, Quick Look, and Open With, keeping Show in Finder in Raycast's secondary `⌘↩` position.
- Add All Types, Directory, and File filters alongside independent, remembered sort choices in the top-right dropdown.
- Build a name index with `fd` and query it with SQLite full-text search; obtain fd automatically when needed and run only when you ask for it with Rebuild Search Index (`⌘⇧R`).
- Choose which folders the index covers and which names to ignore in Search Index Settings, with the built-in exclusions listed alongside your own and index stats for disk usage, entry counts, and the last scan duration.
- Automatically include all provider folders under `~/Library/CloudStorage`, not just Google Drive, and list them in Search Index Settings.
- Keep nested scopes independent, so excluding `~/Library` from the home scan does not suppress explicitly included CloudStorage providers; avoid duplicate traversal and preserve child coverage during incomplete scans.
- Pass ignore patterns to `fd` unchanged, so its glob syntax works, and optionally respect `.gitignore`, `.ignore`, and `.fdignore` files found while indexing.
- Drop entries for a folder removed from the scope on the next rebuild that reaches the end of every remaining folder; a rebuild that stops early keeps them.
- Rank history, pins, cached results, and indexed names together, and publish one finished list per query.
- Answer each settled query with a single database lookup, so rows do not appear one at a time and the list does not reorder while you read it.
- Cap each query at 50 ranked matches and each cached source at 50 entries; stream directory reads and report partial coverage when capped.
- Push type, extension, date, size, and hidden-file filters into the database query, so they decide which matches reach the ranking limit.
- Limit the displayed list to 50 rows and build action menus and details only for the selected item to reduce memory use.
- Keep search active on first launch, reopening, and rapid edits back to the same query.
- Synchronize typed text with Raycast's input updates to prevent stale queries from overwriting the search bar.
- Keep query text independent of incoming results so rapid typing is not overwritten by older updates or folder initialization.
- Keep the first item highlighted as startup and folder results arrive, request focus after publishing rows, and recover missing selection without requiring a native selection event.
- Ignore intermediate automatic selections until the current first row is acknowledged; preserve subsequent user selection and parent-navigation focus.
- Use a compact single-line location and status heading.
- Add Return to Start (`⌘⇧H`) in Actions to clear the query and folder without leaving the command or growing the screen stack.
- Query the index at three characters and say how many more are needed below that; keep memory results available at any length.
- Keep healthy folder reads moving past stalled files; collection does not depend on scrolling.
- Isolate indexing reads by cloud provider, including symlink targets outside CloudStorage and explicit scopes inside them, so stalled mounts cannot block later local rebuilds.
- Isolate cached-result validation by provider so stalled cloud paths do not block local files or other providers.
- Keep the previous folder listing when a refresh fails, and clear it when a successful refresh finds the folder empty.
- Keep paths discovered by `fd` searchable when their metadata reads time out.
- Keep pin, visit, and learned-query keys unified when alias resolution times out and later succeeds.
- Refresh a shortcut's storage identity before recording an action; retain its saved identity on timeout and update ranking and pin state when its target changes.
- Coordinate deletion with pending history and cache writes; bound cached-path metadata reads and retain cached results when metadata stalls.
- Prevent delayed pin, ranking, and learned-query actions from restoring data or UI state after deletion.
- Recover healthy usage records and learned pairings when individual stored entries are malformed.
- Keep folder navigation and native file actions usable when optional ranking storage cannot be read or written.
- Navigate folders with `⌥⌘↓` and `⌥⌘↑`, or type an absolute or home-relative path.
- Use native navigation with a lightweight root and one active search route, without saved folder history; release each previous result view.
- Return to the empty start screen with native Back; preserve typed queries when restarting search, including during development-mode effect replay.
- Detach native control callbacks when results are discarded so development tools cannot retain their index arrays.
- Filter with `-d`, `-f`, `ext:`, `after:`, `before:`, `size:`, and dot-prefixed hidden-file queries.
- Learn query-to-item shortcuts and allow frequently used folders to be pinned.
- Follow Google Drive shortcuts when indexing, so a shared folder is findable by the name you gave it in My Drive and its contents by their own names, under the path you see in Finder.
- Show whether results are complete, truncated, running on memory alone because no index has been built, or based on a location the last rebuild left incomplete.
- Report unreadable folders, unreadable indexes, and usage-metadata failures without discarding existing results.
- Keep valid usage metadata when one item cannot be read, and report the result as partial.
- Preserve saved paths when settings are malformed or incomplete, including paths within scopes that still appear in the recovery settings.
- Keep saved CloudStorage provider scopes when they disappear from discovery while cloud inclusion remains enabled; continue removing unrelated scopes that the user removed.
- Track each automatic provider's current and pending targets. Retire superseded targets after a complete authoritative rebuild, while preserving partial results and roots shared with absent providers or explicit scopes.
- Commit provider retirement, deferred stale-path removal, and coverage cleanup together so a failed cleanup can be retried safely.
- Retire a provider proven to have become a file, and clean up an authoritative empty configuration without treating absent providers as removed.
- Preserve legacy external provider targets whose original source cannot be established until cloud inclusion is disabled.
- Preserve descendants of a previously indexed directory shortcut while its target is unavailable, including across repeated rebuilds.
- Keep the previous index when the drive is offline or unmounted. Partial scans merge what they find. A root removes stale paths only after an error-free scan with authoritative settings.
- Prevent overlapping manual indexing runs from replacing each other's results.
- Prevent indexing from restoring data after deletion completes.
- Refresh open folders asynchronously, keep search usable while the index is being rebuilt, and cancel obsolete queries and scans.
- Keep usage data and indexes on the Mac, with actions to reset rankings or delete all extension data, including the index database and the bytes it freed.
