# Laravel Forge Changelog

## [API v2 Migration & Global Site Search] - {PR_MERGE_DATE}
- Migrated to Laravel Forge API v2 (v1 is deprecated); requires a new v2 API token
- Added organization filtering with a settable default organization
- Search sites by domain across every server: new "Search Sites" command, and the "Manage Servers" command now lists and searches sites too — type a domain to open a site directly
- Removed the background deployment menu-bar command: its constant polling of every org's sites doesn't fit the v2 org-scoped API's rate limits

## [Fix] - 2023-05-12
- Fixes bug in displaying the ssh:// protocol string
## [Fix] - 2023-05-04

- Fixes a bug in the launch command invocation.

## [Complete Rewrite] - 2023-04-17
- Rewrite from scratch using modern Raycast features
- Better caching with predictive pre-fetching
- Passive deployment checking via BG command
- Dynamic activity icons
- Trigger command from anywhere with arguments
- Shows system notification when deploy starts
- Add view into recent deployments

## [Cache optimization] - 2022-12-29
- Update initial view to show cached data immediately

## [Per-site SSH Command] - 2022-04-20
- Add “Open SSH connection” command to sites

## [Better search and updated UI] - 2022-04-02
- Update Raycast deprecated components
- Add new transition and error views
- Add server search by site and site alias
- Add positional breadcrumbs to show server/site relationship
- Various type improvements and code tweaks
