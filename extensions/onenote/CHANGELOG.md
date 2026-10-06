# OneNote Changelog

## [Fix note search and loading errors] - {PR_MERGE_DATE}

- Search note content as well as titles, including text beyond the preview.
- Find local search indexes in UUID macOS containers and different OneNote version folders.
- Show the actual loading error and offer a retry instead of reporting every failure as a missing installation.
- Publish completed search databases atomically so overlapping or interrupted rebuilds preserve working searches.
- Retry a failed full-text index on the next launch without waiting for a notebook change.

## [Fix search memory usage] - 2026-05-20

- Reduced search list memory usage by loading full page content only when a page detail is opened.

## [Initial Version] - 2023-02-14
