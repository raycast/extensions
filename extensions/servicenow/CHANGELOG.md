# ServiceNow Extension Changelog

## [OAuth, Flexible Instance URLs & New Admin Commands] - {PR_MERGE_DATE}

- Added OAuth 2.0 (PKCE) as an alternative to Basic Auth, selectable per instance profile. Tokens refresh automatically; a **Sign In / Re-authenticate** action recovers profiles whose refresh token has expired. Auth failures are surfaced as a red exclamation accessory in **Manage Instance Profiles**.
- Added support for FedRAMP instances (`*.servicenowservices.com`) and on-prem deployments. The **Instance URL** field now accepts a subdomain or a full URL.
- Added a new **Cancel My Transactions** command to stop a runaway transaction (e.g. a stuck Background Script) and unlock your ServiceNow session without opening a new browser.
- Added a new admin command, **Find Record References**, which lists every column across the instance that references a given record, with a one-click action to open the filtered list view.
- Added one-click actions in the instance profile form to download the extension's update sets from ServiceNow Share: **ACLs for Non-Admin Users** (renamed from "Extension Update Set") and the new **Default OAuth Client**.
- Renamed several commands to follow Raycast's `<verb> <noun>` convention: **Search** → **Search Text**, **Quick Search** → **Quick Search Text**, **Search Sys ID** → **Find Record by Sys ID**, **Search Resources** → **Search Developer Portal**, **Open Current Page in Instance** → **Open Current Page in Another Instance**. Command IDs are unchanged, so existing keyboard shortcuts keep working.
- Removed the **Login to Instance** command. It passed Basic Auth credentials through the URL (visible in browser history and server logs)
- Reworked **Search Code** to query the `sn_codesearch` endpoint once per table in the selected search group and render sections progressively as each response arrives, instead of one large request. This avoids the `ECONNRESET` errors that occurred against instances with many matching scripts.

### Fixes

- Fix out-of-memory crash in **Explore Navigation Menu** on large instances by avoiding full-tree cloning per keystroke and throttling the search input.
- Reduce peak memory usage in **Search Code** by no longer retaining the previous result set during revalidation.
- Fix Edit Favorite form opening empty when invoked from search results, code search, navigation history, navigation menu and record details.
- Strip paths from pasted **Instance URL** values (e.g. `https://acme.service-now.com/login.do` is now stored as `https://acme.service-now.com`) so generated links don't break.
- Fix toast reading `containing undefined` when **Open Instance**, **Open Current Page in Another Instance**, or **Cancel My Transactions** is launched without an instance argument and no profile is selected.
- Surface a toast (instead of crashing silently) in **Open All Instances** and **Open Current Page in Another Instance** when the stored instance list cannot be parsed.
- Remove a duplicated query parameter in the **Explore Tables** request.

### Internals

- Extracted the instance-lookup boilerplate shared by every no-view command into a single `resolveInstance` helper.
- Introduced a unified `serviceNowFetch` / `serviceNowFetchRaw` helper used by the favorites and search-history mutations and by the admin background-script client, enforcing a consistent `response.ok` check and dropping the `node-fetch` dependency.
- Routed two remaining ServiceNow URLs through `buildServiceNowUrl` so the **Open Mode** preference is honored consistently (Sys ID lookup result, navigation history actions, reference fields in search detail).
- Removed the hard-coded fallback list of "OOB" code-search tables — Search Code now relies entirely on the `sn_codesearch_table` data returned by the instance, since the underlying `sn_codesearch` endpoint is unavailable anyway when the plugin is missing.
- Removed the unused `node-fetch` and `debug` dependencies.

### UI Consistency

- Standardized every `showToast` call site on the object form and switched caught errors to `showFailureToast`.
- Normalized error toast titles to Title Case (`Could Not Fetch ...`, `Could Not Search ...`).
- Aligned action names in **Manage Instance Profiles** (`Open in ServiceNow`, `Add Instance Profile`) with the rest of the extension and added the standard `Copy URL` shortcut in **Search Text**.
- Made the empty-state copy in **Manage Instance Profiles** match the other commands.
- Replaced the generic `The item is required` form-validation messages with field-specific ones (`Missing instance URL`, `Missing username`, `Missing password`).
- Renamed the hook field `userName` to `currentUserName` to disambiguate it from `Instance.username` (the stored Basic-Auth credential).
- Introduced an `instanceLabel(instance)` helper so every dropdown, section title, and breadcrumb resolves the alias/name choice the same way.
- Added the shared **Manage Instance Profiles** / **Select Instance Profile** actions to the **Search Code**, **Find Record by Sys ID**, and **Find Record References** form ActionPanels so the ⌘M and ⌘I shortcuts work consistently across commands.

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
