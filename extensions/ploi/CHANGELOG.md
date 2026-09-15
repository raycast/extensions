# Ploi Changelog

## [Fix Pagination and Sites Loading] - {PR_MERGE_DATE}

- Fixed Servers pagination replacing the loaded servers with an empty list
- Opening a server now waits for its sites to load, so the list no longer jumps under the cursor

## [Security Maintenance] - 2026-05-21

- Updated the extension to address security advisories.

## [Maintenance] - 2026-03-16

- Update axios to ^0.30.3 to address CVE for denial of service via `__proto__` key in `mergeConfig`

## [Paginated Servers] - 2024-07-24

- You can now view Servers even if they are > 50 (Pagination for Sites will come later)
- Updated metadata images
- `chore` and updates

## [New features] - 2022-06-09

- Updated to latest Raycast API
- Added SSH system user connection for terminal 
