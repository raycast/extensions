# Limitations

Architectural constraints in Raycast that affect this extension.

## Cannot Be Implemented

### No Filesystem Watching

Extensions cannot monitor the filesystem for changes. If files are renamed, moved, or deleted externally while the extension is open, the file list will not automatically update. Users must manually re-invoke the command to refresh.

### No File Preview Beyond Images

Raycast's `Detail` component supports inline image previews but not arbitrary file previews. For PDFs and documents, we generate thumbnails via macOS Quick Look (`qlmanage`) as a workaround, but this does not provide full document preview or scrolling.

### Cannot Rename Across Volumes

Node.js `fs.rename()` does not support moving files across filesystem boundaries (e.g., from an internal drive to an external USB drive). The rename operation will fail with `EXDEV: cross-device link not permitted`. Files must remain on the same volume.

## Partially Limited

| Feature | Constraint | Workaround |
|---------|-----------|------------|
| Undo History | Persisted in Raycast LocalStorage, cleared on extension reset | Configurable max entries; export not available |
| Large Selections (1000+) | Preview and rename operations process sequentially | Preview is capped to avoid UI lag; rename uses batched progress |
| Regex in Replace | ReDoS safety check rejects certain complex patterns | Simplify regex or split into multiple replacements |
