# WinGet Changelog

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

