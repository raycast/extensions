# ServiceNow Extension Changelog

## [Database View Support & Clearer Errors] - 2026-05-21

- **Explore Records** now works on database views and other tables that don't track an update time, instead of failing to load.
- **Find Record by Sys ID** and **Find Record References** now tell you why a lookup failed, whether sign-in failed or your account is missing the admin role, and let you edit the profile and retry without leaving the command. If your instance uses single sign-on, they point you to switch the profile to OAuth.
- In **Explore Records**, hovering the updater avatar now shows both the person's name and their username.

## [OAuth, Windows Support & New Commands] - 2026-05-19

- Added OAuth 2.0 (PKCE) as an alternative to Basic Auth, selectable per instance profile. Tokens refresh automatically and a **Sign In / Re-authenticate** action recovers expired profiles; auth failures are flagged in **Manage Instance Profiles**.
- Added Windows support. On macOS the extension keeps reading the frontmost browser tab via AppleScript; on Windows it falls back to the Raycast Browser Extension's `getTabs()` API.
- Added support for FedRAMP (`*.servicenowservices.com`) and on-prem instances. The **Instance URL** field now accepts a subdomain or a full URL.
- Added new commands: **Cancel My Transactions** (stop a runaway transaction and unlock a stuck session), **Find Record References** (list every column across the instance that references a record), and **Explore Records** (browse any table with search, pagination, and favorites — reachable from **Explore Tables** and **Find Record References**).
- Added one-click actions in the instance profile form to download the extension's update sets from ServiceNow Share: **ACLs for Non-Admin Users** and the new **Default OAuth Client**.
- Renamed several commands to follow Raycast's `<verb> <noun>` convention (e.g. **Search Text**, **Find Record by Sys ID**, **Search Developer Portal**, **Open Current Page in Another Instance**). Command IDs are unchanged, so existing keyboard shortcuts keep working.
- Removed the **Login to Instance** command — it passed Basic Auth credentials through the URL (visible in browser history and server logs).
- Reworked **Search Code** to query `sn_codesearch` once per table and render sections progressively as responses arrive, avoiding `ECONNRESET` errors against instances with many matching scripts.

### Fixes

- Fix out-of-memory crash in **Explore Navigation Menu** on large instances and reduce peak memory in **Search Code** during revalidation.
- Fix Edit Favorite form opening empty when invoked from search results, code search, navigation history, navigation menu and record details.
- Strip paths from pasted **Instance URL** values so generated links don't break.
- Surface a toast (instead of crashing silently) when an instance command is launched without a profile selected or the stored instance list cannot be parsed.

## [Fix] - 2025-05-14

Fixed an issue where the Search by Sys_ID command stopped working after publishing, due to function name minification during the build process.

## [Updates] - 2025-05-13

- Added a new command for admins to **Search by Sys_ID**, allowing to search for a Sys_ID in the selected instance, or in any matching instance from the profiles if no instance is provided.
- Added a new Open Mode preference to control how ServiceNow content is opened when using the extension.
- Simplified the command structure by making the instance input optional, defaulting to the selected instance if none is provided, and eliminating the need for multiple commands for:
  - **Quick Search**
  - **Open Instance**
  - **Login to Instance**
- Replaced browser-based commands with AppleScripts so that the Raycast Browser extension is no longer required.
- Fixed an issue with displaying favorites, improving overall system stability and responsiveness.

## [Navigation History Command Fix] - 2024-12-02

- Fixed an issue with the Explore Navigation History command that was failing when the instance had a different date format from the Out-of-the-Box (OOTB) format.
- Applied minor fixes and aesthetic improvements for a smoother user experience.

## [New Commands] - 2024-11-25

- Added the **Manage Favorites** command to manage your favorite items and groups.
- Introduced the **Explore Navigation Menu** command to browse the navigation menu's applications and modules.
- New **Explore Navigation History** command to view the instance elements you've previously visited.
- Favorites now appear in search results for easier access.
- Added limited and full options, defined at the profile level.

## [Fixes & Bits] - 2024-10-23

- Documate pages now open directly in the editor
- Improved search results filtering
- Added **Login to Selected Instance** command
- Added **Search Resources** command to help find ServiceNow resources
- Removed unnecessary tooltips in the Instance Profile Form for a cleaner interface

## [Initial Version] - 2024-10-17
