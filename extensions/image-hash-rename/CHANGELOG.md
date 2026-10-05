# Changelog

## [Initial Release] - 2026-03-23

### Added

- Rename images to `[name].[hash8].[ext]` using MD5 content hash
- Idempotent: already-hashed files are skipped. The hash embedded in the filename is verified against the actual file content, so files that happen to carry an 8-character hex segment (e.g. `logo.deadbeef.png`) are still renamed correctly if they were never processed by this tool
- Supports JPG, JPEG, PNG, GIF, WebP, SVG, BMP, TIFF, TIF, ICO, AVIF
- All filesystem operations use `fs/promises`; directory entries are stat'd concurrently via `Promise.all`
