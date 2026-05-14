# System Monitor Changelog

## [Eliminate Zombie Processes] - 2026-03-20

- Replace all `exec()` calls with `execFile()` to avoid spawning shell processes
- Remove `systeminformation` and `os-utils` dependencies (both spawn child processes internally)
- Rearchitect menubar command to align with Raycast's menu-bar lifecycle (load → render → unload)
- Cache menubar data to disk via Raycast Cache API to prevent flicker between interval restarts
- Cache `system_profiler` results for battery condition/capacity (rarely changes, slow to fetch)
- Poll for live updates only while the menu is open (2s interval via `useInterval`)
- Parallelize system data fetches with `Promise.all` for faster command execution
- Fix `pmset -g log` buffer overflow in Power Monitor view

## [Fix Zombie Process Accumulation] - 2026-03-20

- Add revalidation guards to prevent overlapping child process spawns in the menubar command
- Increase polling intervals (1s → 3s for stats, 3s → 5s for temperature) to reduce process spawn rate

## [Fix Stale Menubar Readings] - 2026-03-16

- Enable background refresh for the menubar command so pinned stats stay up to date

## [Fix Temperature Polling] - 2026-03-16

- Moved temperature sensor polling to a dedicated 3s interval to prevent stale readings

## [Added Menubar Pin-to-Display] - 2026-03-04

- Click any stat in the menubar dropdown to pin it as persistent text next to the icon
- Supports CPU, temperature, memory, battery, network, and storage
- Click again to unpin

## [Added Temperature Monitoring] - 2026-02-19

- Added temperature view under CPU section
- CPU temperature displayed in menu bar dropdown

## [New Additions & Chore] - 2026-02-02
- Added customisable tags for menubar entries
    - Universal tags
        - `<BR>` for line breaks
        - `<MODE>` for display mode(toggles between "Free" and "Used")
    - Module specific tags can be seen by hovering over the preferences text box
- Made Loading tags use `…` consistently instead of `...`
- Updated free and used preference to be per-module for cpu, memory, disk and battery usage
- Removed displaymode field from menubar


## [Toggle Display Mode + Modernize + Add README] - 2026-01-19

- Add a preference to toggle between free and used display modes for CPU, Memory and more (ref: [Issue #24612](https://github.com/raycast/extensions/issues/24612)).
- Modernize extension to use latest Raycast configuration.
- Add README.md.

## [New Additions] - 2025-08-05

- Add a new preference option for the `Menubar System Monitor` command to customize the menu bar icon.

## [Improvements] - 2025-06-04

- Improve the script to ensure it waits for the Activity Monitor to open before clicking the radio button

## [Improvements] - 2025-03-17

- Improve the `onAction()` so it can open the Activity Monitor directly without selecting a tab

## [New Additions] - 2025-03-11

- Add a new menubar feature to display system monitor information in the menubar

## [Update] - 2025-03-03

- Update the action to open the corresponding tab in the System Monitor

## [Fix] - 2025-01-02

- Fix issue when showing battery level on Intel-based Macs

## [Chore] - 2024-11-24

- Fixed wording in description

## [Fix] - 2024-08-12

- Fix issue when showing processes that consume more than 9Gb of RAM

## [Update & New Additions] - 2024-04-26

- Update dependencies and `package.json` file structure to follow the latest version from Raycast
- Overall code improvements
- Add Battery Temperature

## [New Additions] - 2024-02-09

- Add new System Info panel
- Update screenshots
- Use default _internal_ Raycast icons
- Improve code readability

## [Update] - 2023-10-17

- Improve performance

## [Update] - 2023-08-07

- Added preference to select active tab

## [Update] - 2023-06-14

- Added better wording for the battery charge status

## [Update] - 2023-06-12

- Added Time on Battery

## [New Action] - 2023-05-31

- Added Open Activity Monitor action

## [New Additions] - 2022-07-12

- Updated CPU monitor to show load average and process list of highest CPU consumption
- Updated memory monitor to show Disk Usage and process list of highest RAM consumption
- Added network monitor
- Added power monitor

## [Update] - 2022-06-20

- Updated Raycast API to 1.36.0
