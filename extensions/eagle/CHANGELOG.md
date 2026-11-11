# Eagle Changelog

## [AI Tools] - {PR_MERGE_DATE}

- Add AI tools to inspect the active library, find assets, import one local or remote asset, and update specified metadata.
- Confirm writes against the active library, preserve existing tags and folder memberships, and reconcile asynchronous imports without automatic resubmission.

## [Maintenance] - 2026-03-16

- Update axios to ^0.30.3 to address CVE for denial of service via `__proto__` key in `mergeConfig`

## [Major Update] - 2025-11-03

### Added
- Grid layout option for item viewing
- Trash view command
- Library switching command
- Add item from URL command
- Add item from clipboard command
- Move to trash action
- Reveal in folder action
- Edit item tags and annotations
- Create, rename, and move folders
- Enhanced folder navigation

### Changed
- Upgraded to latest Raycast API (v1.103.0)

### Fixed
- Move to trash action properly disabled when already in trash

## [Initial Version] - 2022-04-22
