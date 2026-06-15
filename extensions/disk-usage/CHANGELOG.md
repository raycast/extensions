# Disk Usage Changelog

## [Bug Fix] - 2026-01-21
- Fix file deletion if they have already been deleted. `Error: ENOENT: no such file or directory, realpath`

## [Improvements] - 2026-01-04

- Optimized scanning speed using streams and lightweight objects on the heap.
- Fixed [Error: Scan failed with code null](https://www.raycast.com/extension-issues/easymikey/disk-usage/7157549154)

## [Improvements] - 2025-12-16

- Completely rewrote the scanning architecture to use file-based caching.
- Optimized scanning speed by ignoring system junk folders and very small files.
- Improved UI stability: the file list no longer flickers during rescans.
- Added real-time memory (RAM) usage indicator during scanning.
- Added "Copy Path" action (`Cmd` + `Shift` + `C`) for files and restricted items.
- Fixed [Error: JS heap out of memory](https://www.raycast.com/extension-issues/easymikey/disk-usage/7110092740).
- Fixed [Error: ENOENT: no such file or directory](https://www.raycast.com/extension-issues/easymikey/disk-usage/7104073808).

## [Initial Version] - 2025-12-09

- Initial release of Disk Usage extension
- Scan home directory to identify large files and folders
- Visual size indicators with usage bars
- Navigate through folders using Action.Push
- Delete files and folders directly from the extension using Action.Trash
- Bulk selection and deletion support
- Automatic size recalculation when files are deleted
- Support for denied access items display
