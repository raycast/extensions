# Raycast Store Updates Changelog

## [Raycast 2 Compatibility] - 2026-08-27

- Updated to `@raycast/api` 2.x and `@raycast/utils` 2.x

## [Fix Windows crash, reduce API usage, and improve the menu bar] - 2026-07-31

- Fix a `TypeError: e is not iterable` crash reported on Windows. The GitHub API does not always answer an array-returning endpoint with an array, and on Windows requests traverse a system proxy that can return an HTML error page or an empty body with a 200 status. Responses are now parsed defensively instead of being cast and iterated
- Handle every non-OK GitHub status, not just 403 and 429, which previously fell through to an unchecked cast
- Only treat a 403 as a rate limit when GitHub reports the quota is actually exhausted. A 403 from a proxy or VPN carries no rate-limit headers and was starting an hour-long cooldown GitHub never asked for
- Never invent a cooldown longer than the evidence supports: without a reset header the wait is the ordinary 5 minutes rather than a fabricated hour, and a stored cooldown beyond GitHub's one-hour window now self-heals
- Reduce GitHub API usage: extension slugs are resolved from the `extension:` label already present in the pull-request response, and the per-pull-request file lookup is now capped per refresh so a single scan can no longer exhaust the hourly budget
- Only adopt a slug the pull request's own label asserts. A branch name that happens to match another extension could previously produce the wrong store link and changelog
- Fix duplicate entries when two removal pull requests deleted the same extension
- Only report an extension as removed on a definitive 404, so a transient server error or rate limit no longer marks a live extension as deleted
- Keep previously loaded updates on screen when a refresh fails, instead of clearing the list
- Show the extension's own icon in the menu bar, with rounded corners in both the menu bar and the main list
- Hold ⌥ on a menu bar item to open that extension's changelog inside Raycast instead of its store page
- Add a preference for whether the menu bar counts all updates or only updates for extensions you have installed
- Show recent activity in the menu bar on first run, instead of an empty badge until the next extension ships
- Fix "Mark All as Seen" marking items seen that were never shown
- Add an icon to every category tag, matching the Raycast Store's category styling
- Fix the macOS platform icon being nearly invisible in dark mode
- Add an experimental, opt-in GraphQL transport for the pull-request list. It requires a GitHub token — GraphQL has no unauthenticated tier — and falls back to REST without one or on any error. REST remains the default
- Failure toasts now carry a "Copy Error" action

## [Menu bar, category and author filters, GitHub token, and reliability fixes] - 2026-06-16

- Add an optional menu-bar command with a badge showing the number of new and updated extensions since you last checked, a dropdown of recent items, "Mark All as Seen", and hourly background refresh
- Add category and author filters: filter by any category present in the list, or "Show Only This Author" from any item, with a "Clear Filters" action
- Add an optional GitHub personal access token preference that raises the API rate limit from 60 to 5,000 requests/hour, used for all update and removal detection calls
- Group the list into time sections (Today, Yesterday, Previous 7 Days, Previous 30 Days, Earlier) for easier scanning, each showing its item count
- Sort every filter tab (New, Updates, My Updates, Removed) newest-first, consistently with the All tab
- Fix manual refresh being incorrectly blocked for the rest of the GitHub hourly window: the rate-limit cooldown is now set only on an actual 403/429 (or exhausted quota), not on every successful fetch
- Cache extension `package.json` lookups (6h TTL) and bound network concurrency, eliminating the burst of uncached requests fired on every command open
- Fix a race condition where revalidating could overwrite fresh data with stale results, and stop the updates pipeline from re-running redundantly when the feed merely reloads
- Fall back to the PR's changed file paths when a title-derived slug doesn't resolve, avoiding wrong store URLs
- Validate the remote `platforms` field before use to avoid crashes on malformed `package.json`
- Keep previously loaded updates (and show a clear toast) when rate limited, instead of emptying the list
- Show a loading state while updates are still being processed instead of a premature "No Extensions Found"
- Add Windows keyboard-shortcut variants for read-status, copy-URL, and changelog actions
- Fix "Previous Changelog" navigation when a changelog is opened directly from a mid-list item
- Await refresh so the "Refreshing…" state is shown correctly

## [Add platform filter shortcuts] - 2026-04-30

- Add keyboard shortcuts for toggling macOS-only and Windows-only extension filters
- Add keyboard shortcut for opening extensions in the Raycast Store

## [Detect and display removed extensions] - 2026-02-27

- Detect extension removal PRs using the `no-review` label, removal-pattern titles, and package.json 404 confirmation
- Expand multi-extension removal PRs into one list item per removed extension (e.g., a single PR removing two extensions now shows both)
- Add "Removed" filter to the dropdown with a red minus-circle icon
- Removed extensions show a red "Removed" type tag, "Removed" date label, and link to the PR instead of the store
- Hide changelog, store link, and platform icons for removed extensions (data is unavailable)
- Persist GitHub rate limit state in LocalStorage so the refresh cooldown survives between command opens; reads `X-RateLimit-Reset` header to show a precise "try again in X minutes" toast

## [Improve robustness of update handling] - 2026-02-18

- Add fallback to extract extension slugs from PR file paths when title parsing fails (e.g., PRs with titles starting with "Add", "Fix", etc.)
- Fix date-aware filtering: PRs merged after the feed's publish date are now correctly shown as updates instead of being filtered out
- Add extension actions to CHANGELOG view

## [Add refresh action, improve platform icon colors, and enhance CHANGELOG navigation] - 2026-02-16

- Add CHANGELOG up/down reading navigation
- Add refresh action (⌘R) to ExtensionActions that revalidates both feed and PR data
- Change macOS platform icon from blue (#0A64F0) to 80% black (#000000CC) for better contrast
- Add ChangelogActions component to changelog detail view
- Replace "Show My Updates Only" action with "My Updates" Dropdown Filter
- Improve URL parsing

## [Filter Toggles, Read Tracking & UI Polish] - 2026-02-15

- Replaced platform preference dropdown with in-context filter toggles for macOS and Windows (cross-platform extensions always shown)
- Added "Only Show Installed Updates" toggle to filter updated extensions to ones you have installed
- Added optional read/unread tracking preference — mark items as read individually or all at once, with undo support (⌘Z)
- "All Caught Up!" empty view when all items are marked as read
- Colored platform icons (macOS blue, Windows blue) in both list accessories and detail metadata
- Color-coded category tags in extension detail view
- Added icons to the filter dropdown items (Show All, New Only, Updated Only)
- Extension detail now shows formatted publish/update date and extension icon
- Reordered detail metadata: type → platforms → categories → date → version → PR → author → store link
- Added `.github/CODEOWNERS` and `.github/FUNDING.yml`
- Updated screenshot metadata

## [Now includes Extension Updates] - 2026-02-09

- Now includes extension updates!
- Platform filter preference (All/macOS/Windows) to show/hide preferred platforms
- Integration with GitHub PRs API to track extension updates alongside new extensions
- Detailed view showing extension metadata (version, platforms, categories)
- Changelog viewing functionality with actions to copy recent changes
- Platform icons (macOS/Windows) displayed as accessories

## [Initial Version] - 2026-02-05

- Initial release
