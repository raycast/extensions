# ServiceNow Extension Changelog

## [Unreleased] - {PR_MERGE_DATE}

- Added OAuth 2.0 (PKCE) as an alternative to Basic Auth, selectable per instance profile. Tokens refresh automatically; a **Sign In / Re-authenticate** action recovers profiles whose refresh token has expired. Auth failures are surfaced as a red exclamation accessory in **Manage Instance Profiles**.
- Added support for FedRAMP instances (`*.servicenowservices.com`) and on-prem deployments. The **Instance URL** field now accepts a subdomain or a full URL.
- Added a new **Cancel My Transactions** command to stop a runaway transaction (e.g. a stuck Background Script) and unlock your ServiceNow session without opening a new browser.
- Added a new admin command, **Find Record References**, which lists every column across the instance that references a given record, with a one-click action to open the filtered list view.
- Added one-click actions in the instance profile form to download the extension's update sets from ServiceNow Share: **ACLs for Non-Admin Users** (renamed from "Extension Update Set") and the new **Default OAuth Client**.
- Renamed several commands to follow Raycast's `<verb> <noun>` convention: **Search** → **Search Text**, **Quick Search** → **Quick Search Text**, **Search Sys ID** → **Find Record by Sys ID**, **Search Resources** → **Search Developer Portal**, **Open Current Page in Instance** → **Open Current Page in Another Instance**. Command IDs are unchanged, so existing keyboard shortcuts keep working.
- Removed the **Login to Instance** command. Basic Auth profiles can still be logged in via **Open Instance**; OAuth profiles use **Sign In / Re-authenticate** in **Manage Instance Profiles**.

## [Fix] - 2025-05-14

Fixed an issue where the Search Sys ID command stopped working after publishing, due to function name minification during the build process.

## [Updates] - 2025-05-13

- Added a new admin command, **Search Sys ID**, which searches for a Sys ID in the selected instance, or in any matching instance from the profiles if no instance is provided.
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

- Documate pages now open directly in the editor.
- Improved search results filtering.
- Added the **Login to Selected Instance** command.
- Added the **Search Resources** command to help find ServiceNow resources.
- Removed unnecessary tooltips in the Instance Profile Form for a cleaner interface.

## [Initial Version] - 2024-10-17
