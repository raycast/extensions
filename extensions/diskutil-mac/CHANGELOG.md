# Diskutil Changelog

## [Initial Private Version] - 2023-05-11

## [Public Release Version] - 2025-02-28

- Initial public release
- Check out all the initial features, to be worked on in the future

## [Second Release] - 2025-10-21
- Added support for filtering disks by type (internal/external)
- Implemented size display in overview. Format can be toggled via shortcut `CMD+.` (feedback on format is welcome)
- Backend now supports plist reading for more structured information, viewable as alternative detail view via `CMD+Shift+Enter`
- Added summary display of disk information at the top of the details list
- Minor bug fixes, code improvements, and refactoring

## [1.2.0] - 2026-01-16

- Improved disk accessories for a few cases as well as Mounted/Unmounted status icons
- Introduced progressive rendering for faster initialization performance. (Slightly chunked for performance - feedback welcome)
- Improved filtering and used Removable/Fixed instead of Internal/External.
- Refactored and modularized codebase