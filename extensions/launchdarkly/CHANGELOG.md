# Launchdarkly Changelog

## [Projects, history, favorites and richer targeting] - 2026-09-08

### New

- 📜 **Recent Changes** command: browse the audit log for the project, filter by environment, and open a flag's own change history from its action panel
- 🗂️ **Switch Project** action (`⌘⇧S`) in every command's action menu: pick any project your token can access; the choice is remembered across commands
- ⭐ Favorites (`⌘⇧P`) and recently viewed flags shown above the results
- 🔎 Filter dropdown now covers state, temporary/permanent, *My Flags*, and every flag tag
- 🌍 Environments show their LaunchDarkly color, a critical-environment marker, and the flag's evaluation status (new / active / inactive / launched) with last-requested time
- 📋 Copy the LaunchDarkly URL or an SDK code snippet (Node, React, Python, Go, Java, Ruby); create Raycast quicklinks to flags
- 🎯 Targeting rules and individual targets are rendered as tables, including non-user context kinds; segment keys and prerequisite flags are resolved to their names

### Fixed

- 📊 Rollout weights are shown as percentages instead of raw thousandths-of-a-percent values
- 🎯 "Current Value" correctly reflects percentage rollouts when a flag is on
- 👤 Maintainer avatars no longer render as an empty dashed box (invalid SVG data URI in the old `@raycast/utils`)
- 🔁 Pagination follows the API's `_links.next` instead of guessing from the page size; a comma in the search no longer breaks the filter
- ⚠️ API errors keep the search bar and offer Retry / Switch Project; friendlier messages for 401/403/404/429
- 🔧 Dropped the unsupported `expand` query parameter and a redundant refetch when changing the filter
- ⌨️ Environment reordering uses the standard `⌘⇧↑` / `⌘⇧↓` shortcuts documented in the README

### Internal

- ⬆️ Updated `@raycast/api`, `@raycast/utils`, ESLint (flat config), Prettier and TypeScript
- 🧱 New API client layer with typed endpoints; mock server covers all endpoints used by the extension

## [Small fixes] - 2025-02-08

- 👥 Avatar icons are now displayed better using the `getAvatarIcon` function from `@raycast/utils`
- 📋 Copy feature flag key to clipboard
- 🔗 Expand open in browser action in the feature flag details
- 📝 Updated readme

## [Initial Version] - 2025-01-10

- 🔍 Search through all your feature flags
- 🏷️ View flag details including variations, targeting rules, and prerequisites
- 🌍 Manage multiple environments
- 👥 See maintainer and team information
- 🔄 Quick toggle between flag names and keys
- 🏃 Fast navigation with keyboard shortcuts
