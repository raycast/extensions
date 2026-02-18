# Portals Changelog

## [1.2.0] - {PR_MERGE_DATE}

### Added
- Global search now searches entire folder tree including subfolders, parents, and siblings — not just the current level
- Search works inside subfolder navigation views with full tree results
- Import auto-assigns UUIDs to any folders missing an `id` field, so hand-crafted JSON works without IDs
- Import now shows specific error messages indicating exactly which node failed validation

## [1.1.0] - {PR_MERGE_DATE}

### Fixed
- Deep links (`raycast://`, `slack://`, `notion://`, etc.) no longer get incorrectly prefixed with `https://`
- "URL Copied" toast now appears correctly before the Raycast window closes
- Import now validates folder structure before saving, preventing corrupted data
- Removed unused `extractNode` export, `pinned` field, and `network` permission
- Renamed internal typo `addTopins` to `addToPins`

### Improved
- ID generation switched from `Math.random()` to `crypto.randomUUID()` for guaranteed uniqueness


## [Initial Version] - {PR_MERGE_DATE}
- Initial release