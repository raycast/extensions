# Polar Changelog

## [Security: Refresh Lockfile to Remove Unused Transitive Dependencies] - {PR_MERGE_DATE}

- Refreshed `package-lock.json` to remove stale transitive entries (including `got`/`electron`) that were no longer part of the installed dependency graph.

## [BYOK + View Products] - 2025-07-01

- View Products and their Media
- Set an optional "Access Token" in Preferences to BYOK
- Remove `node-fetch`

## [Update] - 2025-04-09

- Update Polar SDK version

## [Update] - 2025-04-09

- Fix issue with expired OAuth access tokens

## [Update] - 2024-12-20

- Implements a View Customers command
- Properly checks if scopes are sufficient on authorization
- Make sure to open Order on the correct page on https://polar.sh

## [Initial Version] - 2024-12-10
