# Portals Changelog

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