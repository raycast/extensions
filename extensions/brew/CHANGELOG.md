# Brew Changelog

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
