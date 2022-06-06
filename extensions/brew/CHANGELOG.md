# Brew Changelog

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
