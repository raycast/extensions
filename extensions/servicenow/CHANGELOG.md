# ServiceNow Extension Changelog

## [Command title clean-up] - 2026-05-15

- Renamed several command titles for clarity and to follow Raycast's `<verb> <noun>` convention. The underlying command IDs are unchanged, so existing user keyboard shortcuts and aliases keep working.
  - **Search** → **Search Text** (anticipates a future Search Code command).
  - **Quick Search** → **Quick Search Text**.
  - **Search Sys ID** → **Find Record by Sys ID** (you have the ID; the command locates and opens the owning record).
  - **Search Resources** → **Search Developer Portal** (the command targets developer.servicenow.com — docs, API references, blogs, learning, and Share — not your instance).
  - **Open Current Page in Instance** → **Open Current Page in Another Instance**.
- Removed six orphaned legacy command files left over from earlier refactors (`open-selected-instance`, `login-to-selected-instance`, `open-current-url`, `open-current-url-in-selected-instance`, `quickly-search`, `quickly-search-selected-instance`). They were not registered in `package.json` and had no remaining references.

## [New Command: Find Record References] - 2026-05-14

- Added a new **Find Record References** command. Given a base table and a Sys ID, lists every column across the instance that references that record, with a one-click action to open the filtered list view in ServiceNow. Requires an admin profile, as it runs a background script through `/sys.scripts.do`.
- Extracted the shared `ServiceNowClient` helper used by both **Search Sys ID** and **Find Record References** into `src/utils/serviceNowClient.ts`.

## [New Command: Cancel My Transactions] - 2026-05-14

- Added a new **Cancel My Transactions** command. When a long-running transaction (e.g. a runaway Background Script) locks you out of your ServiceNow session, this command opens `cancel_my_transaction.do`, which stops the transaction and unlocks the session — no need to open a new browser or private window. Accepts an optional instance URL or alias; defaults to the currently selected instance.

## [FedRAMP and on-prem support] - 2026-05-14

- Added support for FedRAMP ServiceNow instances (`*.servicenowservices.com`) and on-prem deployments with custom hostnames. The **Instance URL** field in instance profiles now accepts either a subdomain (cloud) or a full URL.
- Centralized URL construction through a new helper, eliminating ~25 hardcoded references to `.service-now.com`.
- Tightened browser-tab detection to parse the hostname instead of substring matching, fixing a minor spoofing edge case.
- Added a one-click action in the instance profile form to download this extension's Update Set from ServiceNow Share (`⌘U`).

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
