# WinGet Changelog

## [Locale and Upgrade Fixes] - 2026-07-17

### Fixed
- Installed and upgradable lists no longer come up empty on non-English Windows: table parsing is structural instead of language-based, and package details parse on all of winget's shipped display languages
- Updates winget lists but cannot actually apply ("no applicable upgrade", or an installer whose reported version winget cannot match) are hidden from upgradable views until winget offers a different version
- Operations that fail because they need administrator rights are retried with winget relaunched elevated, so the UAC prompt is the only confirmation (works during Upgrade All too)
- Installer failures with a documented Windows Installer exit code show its meaning instead of the bare number, an upgrade blocked by another running installation is retried once, and a silent installer aborted because the app is open reports "App in use, close it first"
- Operations no longer fail when the Upgrade All Packages command is disabled ([#29525](https://github.com/raycast/extensions/issues/29525)): they run inside the view that started them instead — the in-flight package finishes even if the view closes, at the cost of live progress toasts

## [Ground-Up Rewrite] - 2026-07-14

A full architectural rewrite of the internals, with the command set expanded from three to six: Show Upgradable and Upgrade All Packages split out from the old Upgrade command, and Export and Import are new.

### Added
- Show Upgradable, Upgrade All Packages, Export, and Import commands (Export/Import expose winget's manifest options)
- Ranked local search over a cached package catalog, with an Index Refresh Interval preference
- Install Version… (auto-pins the chosen version), Download Installer, Repair, and Pin/Unpin actions
- Uninstall All on Show Installed (excludes Raycast and App Installer)
- Long operations (install/upgrade/uninstall/repair/download/import) run detached: starting one returns you to root with a live progress toast that survives closing the window, and notifies on completion either way
- A global operation lock so only one winget operation runs at a time; an in-progress operation can be cancelled, and a crashed one is recovered and reported as interrupted
- Confirmation prompts for destructive actions (Uninstall, Uninstall All, Upgrade All, Cancel)
- Release Date in the detail pane; detail prefetch around the selection
- Test suite covering the concurrency protocol and winget-output parsing against captured fixtures

### Changed
- Install/upgrade outcomes (including no-ops and bulk summaries) are determined from winget's exit codes and its documented return-code table rather than matching English output text, so results no longer depend on the system language
- Bulk upgrades report upgraded / skipped / failed separately and name the failed packages; upgrades winget immediately re-offers (installer reports an unmatchable version) are called out
- Cold start is staged: installed and upgradable data load first and those views become usable immediately, while the full catalog (which powers Search) builds in the background
- Installed and upgradable data refresh on open when stale and after every operation
- Empty states explain themselves, including why Microsoft Store apps don't appear in Search

### Fixed
- Show Upgradable now includes packages winget lists in its separate "require explicit targeting" table, which the previous version omitted
- Package names winget truncates (…) or renders in double-width (CJK) scripts are parsed correctly instead of being misaligned or dropped; truncated names are repaired from the catalog

## [Simplify Package Actions] - 2026-06-10

- Remove the `View Details` action from package action panels
- Make `Install Package` and `Update Package` the primary actions in search and upgrade lists

## [Fix localized upgrade parsing] - 2026-04-23

- Fix winget table parsing on localized outputs by mapping table columns by position

## [Reliability & Details Improvements] - 2026-04-21

- Improve install and upgrade reliability by respecting winget exit codes (no false success toasts)
- Show clear feedback for no-op installs (already installed / no newer version available)
- Align Installed Packages “Upgrades Available” with the Upgrade Packages view
- Add preference to hide packages without a known source in Installed Packages
- Improve package details: show source tags, hide Unknown version, and render license URLs as links
- Provide a friendly details view for unmanaged packages (no winget metadata available)
- Standardize action shortcuts and fix duplicate key warnings in lists

## [Initial Release] - 2026-04-12

- Search packages in the winget repository and install them
- List all installed packages with upgrade and uninstall actions
- View and upgrade outdated packages individually or all at once
- Optimistic removal from list immediately after uninstall
- Run install and upgrade actions in the background with HUD notifications
- Automatic list refresh with feedback after install, uninstall, and upgrade
- Manual refresh action with `⌘ R` shortcut on all views
- Detailed package view with publisher, homepage, license, tags, and installer type
- Copy package ID and command shortcuts to clipboard
- Configurable winget executable path preference
- Graceful error messages when winget executable is not found
