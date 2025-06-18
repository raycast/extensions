# aerospace Changelog

## [Improvements] - 2025-06-18

- Adding logic for config path to match [AeroSpace Custom config location documentation](https://nikitabobko.github.io/AeroSpace/guide#config-location), using extension preferences first, then `~/.aerospace.toml`, then `${XDG_CONFIG_HOME}/aerospace/aerospace.toml`
- Improving visual display of showShortcuts list
  - Adding list sections by mode name
  - Displaying multiple commands as "X & Y" instead of as an array "[X,Y]"
  - Displaying keyboard shortcut keys as "tags" in list item's "accessories"
    - Side note: this is a "workaround", as it does not display the keys like they are in the actions panel or in raycast root window

## [Bug Fixes] - 2025-01-10

- Fix issue with `aerospace` not found if installed in a non-standard location (e.g. managed by `nix-darwin`)

## [Bug Fixes] - 2024-11-14

- Update shortcut description to allow for fuzzy finding without dashes

## [New Feature] - 2024-10-13

- Adds functionality to switch between apps in current workspace
- Inspired by [ Yuriteixeira's Alfred workflow ](https://github.com/yuriteixeira/aerospace-workflow)

## [Bug Fixes] - 2024-09-18

- Update `@iarna/toml` to `v3.0.0` which includes support for TOML 1.0.0

## [Bug Fixes] - 2024-05-27

- Fix screenshots in README

## [Bug Fixes] - 2024-05-06

- Fixed issue with `aerospace` itself not being present
- Added screenshots

## [Initial Version] - 2024-05-01

- Initial release of aerospace extension
