# File Search by Usage Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Search local and cloud files and folders in one usage-ranked list.
- Add All Types, Directory, and File filters alongside independent, remembered sort choices in the top-right dropdown.
- Show history, pins, cached results, and indexed Google Drive locations immediately, then merge delayed Spotlight results.
- Keep live search collecting results until its sources finish, a memory safety limit is reached, or the query or folder changes, without interrupting previews or selection.
- Cap each screen's live ranking pool and cached rows at 500, alongside bounded Spotlight candidates and recursive folder queues; stream directory reads and report partial coverage when capped.
- Limit the displayed list to 100 rows and build action menus and details only for the selected item to reduce memory use.
- Keep search active on first launch, reopening, and rapid edits back to the same query, without requiring setup to refresh it.
- Synchronize typed text with Raycast's input updates to prevent stale queries from overwriting the search bar.
- Keep the first item highlighted as startup and folder results arrive, wait for Raycast's new rows before selecting, and preserve user selection and parent-navigation focus.
- Use a compact single-line location and status heading.
- Retrieve fuzzy alphanumeric filename matches in a second Spotlight pass, including files not yet in the cache.
- Stream results and keep healthy reads moving past stalled files; collection continues independently of scrolling.
- Offer an optional first-run import of recent documents and nearby files, without changing recorded usage.
- Include Google Drive indexing in first-run setup, with separate skip choices, progress, cancellation, and retries for incomplete scans.
- Keep the main setup prompt until setup runs, then keep retries and refreshes in Actions.
- Expand recent-file setup to 500 documents, 50 parent folders, 500 neighbors per folder, and a 10,000-entry cache.
- Coordinate deletion with pending history and cache writes; bound recent-file reads across retries and retain cached results when metadata stalls.
- Navigate folders with `⌥⌘↓` and `⌥⌘↑`, or type an absolute or home-relative path.
- Use one native search screen without saved folder history; release each previous result view and keep setup running across navigation.
- Detach native control callbacks when results are discarded so development tools cannot retain their index arrays.
- Filter with `-d`, `-f`, `ext:`, `after:`, `before:`, `size:`, and dot-prefixed hidden-file queries.
- Learn query-to-item shortcuts and allow frequently used folders to be pinned.
- Index Google Drive shortcuts and shared folders that Spotlight cannot catalog.
- Show whether results are still arriving, complete, truncated, or based on an incomplete Drive index.
- Report unreadable folders and Spotlight failures without discarding existing results.
- Keep valid usage metadata when one item cannot be read, and report the result as partial.
- Keep the previous Google Drive index when the drive is offline or unmounted.
- Keep complete Google Drive indexes when a refresh reaches a scan limit.
- Prevent overlapping manual indexing runs from replacing each other's results.
- Prevent indexing from restoring data after deletion completes.
- Refresh open folders asynchronously and cancel obsolete Spotlight queries.
- Keep usage data and indexes on the Mac, with actions to reset rankings or delete all extension data.
