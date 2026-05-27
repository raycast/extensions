# Procore XER Fixer Changelog

## [Initial Release] - {PR_MERGE_DATE}

- Fix blank `PROJWBS.guid` values using deterministic UUIDv5 GUIDs derived from each WBS node's hierarchical path
- Backfill blank `TASK.target_start_date` and `TASK.target_end_date` values from the best available date on each task
- Write repaired XER to a `fixed-xer` folder next to the source file, never overwriting the original
- Support processing multiple selected `.xer` files in a single run
- Reveal output folder in Finder via toast secondary action after repair completes
