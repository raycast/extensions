# ServiceNow Extension Changelog

## [New Command: Cancel My Transactions] - 2026-05-14

- Added a new **Cancel My Transactions** command. When a long-running transaction (e.g. a runaway Background Script) locks you out of your ServiceNow session, this command opens `cancel_my_transaction.do`, which stops the transaction and unlocks the session — no need to open a new browser or private window. Accepts an optional instance name/alias; defaults to the currently selected instance.

## [FedRAMP and on-prem support] - 2026-05-14

- Added support for FedRAMP ServiceNow instances (`*.servicenowservices.com`) and on-prem deployments with custom hostnames. The **Instance URL** field in instance profiles now accepts either a subdomain (cloud) or a full URL.
- Centralized URL construction through a new helper, eliminating ~25 hardcoded references to `.service-now.com`.
- Tightened browser-tab detection to parse the hostname instead of substring matching, fixing a minor spoofing edge case.
- Added a one-click action in the instance profile form to download this extension's Update Set from ServiceNow Share (`⌘U`).

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
