# com.matbrady.pantheon Changelog

## [Large Account Support] - {PR_MERGE_DATE}

### Fixed

- `terminus site:list` no longer times out after 10s on accounts with many sites

### Added

- "Site List Timeout" preference (default 120s)
- "Refresh Site List" action (⌘R) and loading/error toasts

## [New Dashboard URLs] - 2026-11-14

### Changed

- "Open Pantheon Dashboard" uses Pantheon's new `/workspace/<workspace>/<cms-site|node-site>/<site>` URLs, using the workspace you access the site through (from `site:list` memberships; personal sites use your personal workspace)

## [Uninitialized Site Fix] - 2026-11-13

### Fixed

- Crash when a site has no framework (created but never initialized); these now show a fallback icon and "Not initialized"
- Framework variants like `wordpress_network` now show the correct icon
- Sites on other frameworks (e.g. Next.js/`nodejs`, Backdrop) show a generic code icon instead of a broken image

## [Latest Changes] - 2026-05-11

### Added

- "Show Site Screenshots" preference to toggle live screenshots on/off in the detail panel
- Environment detail now shows "Locked" status and "Created" date
- Site status indicator in site listing with status filter support
- Screenshots support (disabled for frozen sites)
- Backend logo SVG
- Per-site custom admin URL
- Filter sites by organization
- Install screen
- Support for Terminus path configuration
- Support for listing Pantheon multi-dev environments

### Changed

- Adjusted site list order
- Adjusted sites list status icon

## [New Commands & New Additions] - 2021-11-04

### Added

- [feat] Add support visiting the Terminus Commands (CLI) documentation
- [feat] Add support for backing up individual site environments
- [feat] Add support for clearing cache of individual environements

### Removed

- Placeholder for delete site. "With great power comes great responsibilty"

## [Initial Version] - 2022-10-06
