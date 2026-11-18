# Ploi Changelog

## [SSH Terminal Preference] - 2026-09-16

- Added an "SSH Terminal" preference to open SSH connections in Terminal, Ghostty or iTerm2
- Fixed the server "Open SSH (ploi)" action ignoring the "Ploi SSH User" preference
- SSH connections from the server and site views now use the server's SSH port

## [Fix Pagination and Sites Loading] - 2026-09-16

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
