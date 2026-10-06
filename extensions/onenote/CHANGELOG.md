# OneNote Changelog

## [Fix note search and loading errors] - 2026-10-06

- Search note content as well as titles, including text beyond the preview.
- Find local search indexes in UUID macOS containers and different OneNote version folders.
- Open pages by their GUID without requiring the named-container account cache.
- Show the actual loading error and offer a retry instead of reporting every failure as a missing installation.
- Publish completed search databases atomically so overlapping or interrupted rebuilds preserve working searches.
- Retry a failed full-text index on the next launch without waiting for a notebook change.
- Treat dollar sequences in searches literally instead of expanding them into SQL fragments.
- Show notebooks and sections before recent notes when browsing grouped results.
- Keep parent and ancestor labels consistent with the database each view is reading.
- Look up ancestor labels by indexed IDs so large libraries avoid a folder scan for every result.
- Reuse unchanged fallback databases without loading their full contents into memory for an index retry.

## [Fix search memory usage] - 2026-05-20

- Reduced search list memory usage by loading full page content only when a page detail is opened.

## [Initial Version] - 2023-02-14
