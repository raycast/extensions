# Brew Changelog

## [Install statistics & popularity sort] - {PR_MERGE_DATE}

- Search: "Sort by Popularity" (⇧⌘P) orders results by installs over the last 30 days, ranking every match before the list is truncated — so the top rows are the most installed overall, not of the first hundred. An empty query lists the most installed packages outright.
- The detail sidebar and the Details view both show a package's install counts for 30, 90 and 365 days, plus build errors, matching the analytics table on its formulae.brew.sh page. Only the selected package is fetched.
- Deprecated and disabled packages carry a warning at the top of the sidebar, with the reason, the date, and the replacement package where Homebrew names one.
- "Hide Description" (⇧⌘Y) drops the description pane and shows the sidebar as a pure metadata list, with a Caveats indicator; the full caveats text stays in Show Details, which renders it as prose.
- "Show Details" is now offered even when the sidebar is open. It previously disappeared in that state, leaving "Show in Finder" as the default action on an installed package. Install and Upgrade remain the default where they apply.
- Display toggles are grouped in a "View" section. "Toggle Details" is now "Toggle Sidebar" (⇧⌘D), and works in Search too; "Hide Dependencies" no longer appears in Search, where nothing filtered by it. Show Installed adds an install date and marks pinned formulae.
- Search now marks an installed package as outdated when an update exists, and offers Upgrade on it. Previously only Show Outdated knew, because the installed cache never expired on `brew update` — its freshness test watched only local install state.
- Show Outdated groups pinned formulae into their own section, as Show Installed does. They are the ones `brew upgrade` refuses and Upgrade All skips, so keeping them out of the actionable list says so without the row having to.
- Pinning uses a tack rather than a map pin, and Show Outdated marks a pinned formula with that icon in place of the word "Pinned". Upgrade actions carry the same up-arrow as the row they act on, instead of a hammer.
- Upgrading a pinned formula now says so instead of failing. `brew upgrade` refuses a pinned package outright, so the action surfaced its error; it now skips with an explanation, matching Upgrade All which already skipped them.
- An available update is now marked the same way everywhere — a yellow up-arrow, replacing a red check in Search that clashed with the red used for a failed upgrade, and a grey check in Show Outdated that was the "upgraded" glyph greyed out.
- The Details view and the search sidebar now show the same metadata, built from one definition. They had drifted: statistics, the deprecation warning and the corrected version line each landed in one and not the other.
- The version row leads with the version you actually have, showing `installed → available` when they differ. It previously showed the available version labelled "installed", so an outdated package read as current.
- Cached downloads are now written atomically, so an interrupted one can no longer leave a partial file that later fails to load. This covers the package index every command depends on, not just the new statistics. Clear Cache removes leftover temporary files too.
- Updated to `@raycast/api` 2.x, and to a `brace-expansion` release without the denial-of-service advisory (GHSA-rgw5-rvv9-x895).

## [Upgrade View] - 2026-08-27

- The Upgrade command now lists the outdated formulae & casks, matching the Show Outdated command, instead of a list of progress steps.
- Upgrade progress is reported via the toast/HUD, with the icon of each package reflecting its upgrade status.
- "Upgrade All" now upgrades each package in turn, so its progress is reported per package.
- Added a Refresh action to the outdated action panel.
- Pinned formulae are skipped when upgrading.

## [Adopt] - 2026-08-19

- Added "Copy Adopt Command" (⌘⇧⌥C) and "Run Adopt in <terminal>" (⌘⇧↵) actions in Search for packages not yet managed by Homebrew. They run `brew install --adopt` to reclaim an externally-installed package (e.g. installed via a .dmg or another package manager) into Homebrew so it is covered by `brew upgrade`.
- The Adopt action is intentionally not shown as a direct action for uninstalled packages so it doesn't sit confusingly next to Install; adopt is available via the copy/run command actions.

## [Pin visibility, outdated tags, detail pane] - 2026-08-04

- Show Installed: pinned formulae now render in their own "Pinned Formulae" section at the bottom of the list, with the count as the section subtitle, instead of sitting unlabelled among the other formulae
- Installed packages with an available update now carry an `Outdated` tag — formulae and casks both. The list component is shared, so the tag also appears for installed-and-outdated packages in Search results
- Show Installed: ⌘⇧D toggles a metadata detail pane for the selected package
- A list of nothing but pinned formulae no longer reports itself as empty

## [Bug fix] - 2026-08-03

- Fixed "Show Installed" listing no packages on every open after the first. The installed-package lookups are `Map`s, which serialise to `{}`, so the cached value was emptied on write and then re-served empty forever. The serialisable form is cached now and the lookups are rebuilt on read; cache entries written by earlier versions are discarded rather than trusted.
- Fixed Search intermittently failing to mark packages as installed, which had the same cause.

## [Bug fix] - 2026-07-10

- Search now works instantly against the existing package index while it refreshes in the background, instead of blocking until the refresh completes

## [Manage Services] - 2026-07-09

- Added a "Manage Services" command to list Homebrew services and start, stop, or restart them individually or all at once. Actions update the list optimistically so it reflects the new state immediately.
- Added a "Services Menu Bar" command to control Homebrew services from the menu bar, with a submenu per service and start/stop/restart all. The menu refreshes on a configurable interval.

## [Bug fix] - 2026-05-21

- Improves reliability of index cache
- Improves toast error message if fetch fails
- Adds a "Clear Cache & Retry" action to the error toast if fetch fails

## [Add Keyboard Shortcuts] - 2026-05-12

- Added keyboard shortcuts to common Brew actions, including opening package pages, opening homepages, copying URLs, and running terminal commands.
- Standardized shortcut usage with Raycast common shortcuts where appropriate.

## [Bug Fix & Launch Argument] - 2026-05-12

- Added launch argument to Search command for pre-filling the search query before opening
- Fixed search not working while the formulae/cask index is being downloaded on cold start

## [Cask Id] - 2026-03-24

- Add cask id to the cask metadata

## [Improvements] - 2026-02-24

- Remove updating homebrew index toast from outdated command

## [Bug Fix] - 2026-02-24

- Improve install/uninstall/upgrade failure toasts by surfacing concise Homebrew errors instead of full auto-update logs.
- Keep full `stderr`/`stdout` output available through the toast's `Copy Logs` action for debugging.

## [Improvements] - 2026-02-19

- Improve handling of abort signal when loading search command

## [Improved Memory Usage] - 2026-02-16

- Use chunking to significantly reduce working memory

## [Metadata Detail Panel] - 2026-01-27

- Added optional split-view metadata panel for search results
- Enable "Show metadata panel in search results" in Search command preferences (default true)
- Displays package description and metadata alongside the search list

## [Improvements] - 2026-01-05

- Add a toggle to filter installed packages, allowing users to hide dependencies and show only those explicitly "installed on request".

## [Homebrew 5.0 Support] - 2025-12-16

- Added compatibility with Homebrew 5.0
  - Added preference to disable concurrent downloads (enabled by default in Homebrew 5.0)
  - Added preference to opt-in to Homebrew's new internal API (96% smaller downloads)
  - Updated documentation with Homebrew 5.0 compatibility information
- Improved first-run experience with download progress indicators for large downloads (30 MB+)
- Added hidden-by-default "Clear Cache" command for troubleshooting
- Reordered Casks over Formulae in Search for better readability and discoverability
- Optimized package loading with two-phase strategy (fast list, then full metadata)
- Added lazy loading for package details to reduce initial load time
- Added Upgrade view with clearer progress indicators and easier cancellation
- Refactored codebase with improved error handling and logging

## [Improvements] - 2025-12-01

- Update dependencies and replace node-fetch with native fetch API
- Upgrade react to 19.0.10

## [Bug Fix] - 2025-11-03

- Fixed an issue where the the terminal command may be mis-typed in the Raycast window

## [Improvements] - 2025-02-17

- Add a new action to open the Brew formula/cask page in the browser

## [Improvements] - 2025-01-07

- Optimized checkmark icon
- Minor change on tint color and minor fixes
- Updated metadata

## [Improvements] - 2025-01-02

- Add terminal option for Ghostty
- Updated dependencies
- Fixed linter error
- Organized code

## [Improvements & Bugfix] - 2024-09-22

- Fix detail panel for tap that doesn't have a license ([#12507](https://github.com/raycast/extensions/issues/12507))
- Add JSON Debug Info Action

## [Improvements] - 2024-07-29

- Added new terminal options for Alacritty, kitty, WezTerm and Hyper.
- Used app icons for actions to run commands in terminals.
- Apply Destructive style to Uninstall actions.
- Fallback to Terminal.App in case the selected terminal app is not installed.

## [Improvements] - 2024-06-14

- Updated dependencies

## [Bug Fix] - 2024-07-03

- Fix a crash that could occur when showing installed formula or cask

## [Improvements] - 2024-06-24

- Search now includes cask names

## [Improvements] - 2024-06-24

- Move formula and cask info to the metadata panel
- Dependencies are displayed green if installed

## [Improvements] - 2024-06-14

- Updated dependencies
- Updated screenshots
- Added formula/cask name to the detail view

## [Bug Fix] - 2024-05-14

- Remove deprecated `--ignore-pinned` upgrade flag.

## [Bug Fix] - 2024-03-22

- Fixed various crashes that occurred due to missing data.

## [Improvements] - 2024-03-08

- Add `Warp` as an option for terminal
- Use current terminal name for actions

## [Improvements] - 2024-02-11

- Add `cleanup` command

## [Improvements] - 2024-01-10

- Added `Quarantine` preference to enable or disable quarantine of files downloaded by brew

## [Bug Fix] - 2022-12-01

- Added `--ignore-pinned` flag to `brew upgrade` command to avoid problems on systems that have pinned packages installed

## [Bug Fix] - 2022-11-16

- Improved error handling for invalid json cache
- Ensure cache is fetched only once (avoids memory errors)

## [Bug Fix] - 2022-11-14

- Reduce memory requirements for the "Search" command.
- Improve caching logic

## [Updated Dependencies] - 2022-11-11

- Upgraded to latest node dependencies. Should fix a memory issue.

## [Improvements] - 2022-08-17

- Add a copy install command action
- Add run install command in terminal action

## [Bug Fix] - 2022-08-15

- Fix error when loading "Show Outdated" command

## [Improvements] - 2022-08-10

- Add a "Custom Brew Path" preference for users with brew installed in a non-standard path
- The extension will now prompt for user's login password if brew requires authorization when installed or uninstalling casks
- Improved reporting of fetch errors
- Add a search bar filter for the installable type (formula or cask).

## [Improvements] - 2022-06-06

- Removed --dry-run flag when running the Upgrade command so the casks and formulas actually upgraded

## [Search] - 2022-03-15

- Improve search accuracy (now includes the description)
- Fix an issue loading installed formulae where user has a large number installed
- Upgrade to latest @raycast/api

## [Improvements] - 2022-01-17

- Improve reliability of `outdated` command
- Add action to copy formula/cask name
- Add cask name & tap to cask details
- Add Toast action to cancel current action
- Add Toast action to copy error log after failure

## [Upgrades] - 2021-12-01

- Add `upgrade` command
- Add greedy upgrade preference

## [Improvements] - 2021-11-19

- Improve discovery of brew prefix
- Update Cask.installed correctly after installation
- Fix installed state after uninstalling search result
- Fix cache check after installing/uninstalling cask
- Add uninstall action to outdated action panel

## [Casks] - 2021-11-04

- Add support for searching and managing casks

## [Initial Version] - 2021-10-26
