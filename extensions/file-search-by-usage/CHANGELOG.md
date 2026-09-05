# File Search by Usage Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Search local and cloud files and folders in one usage-ranked list.
- Show history, pins, cached results, and indexed Google Drive locations immediately, then merge delayed Spotlight results.
- Navigate folders with `⌘→` and `⌘←`, search from the frontmost Finder folder, or type an absolute or home-relative path.
- Filter with `-d`, `-f`, `ext:`, `after:`, `before:`, `size:`, and dot-prefixed hidden-file queries.
- Learn query-to-item shortcuts and allow frequently used folders to be pinned.
- Index Google Drive shortcuts and shared folders that Spotlight cannot catalog.
- Show whether results are still arriving, complete, truncated, or based on an incomplete Drive index.
- Report unreadable folders and Spotlight failures without discarding existing results.
- Keep valid usage metadata when one item cannot be read, and report the result as partial.
- Keep the previous Google Drive index when the drive is offline or unmounted.
- Prevent overlapping manual indexing runs from replacing each other's results.
- Refresh open folders asynchronously and cancel obsolete Spotlight queries.
- Keep usage data and indexes on the Mac, with actions to reset rankings or delete all extension data.
