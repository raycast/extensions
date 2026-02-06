# Kill Process Changelog

## [UX and Preferences] - {PR_MERGE_DATE}

- Reworked preferences layout: added `Default Sort` dropdown (defaults to Memory), moved app aggregation into `Grouping`, moved PID/path options into `Advanced Filtering`, and renamed `Refresh Duration` to `Refresh Interval (ms)`
- Switched to Raycast native list filtering and introduced `keywords` so searching by PID/path respects the corresponding preferences (also adds path segment keywords for more reliable matches)
- Added a custom empty state for when no results match
- Restored the Cmd+K action list to match the Store version (Kill, Force Kill, Copy Path, Reload, Toggle Aggregating Apps) with no extra actions
- Tweaked CPU/Memory formatting to reduce noise and improve readability (examples):
  - CPU: `0.00%` -> `0%`, `6.80%` -> `6.8%`, `12.00%` -> `12%`
  - Memory: `604.22 MB` -> `604 MB`, `2.00 GB` -> `2 GB`, `2.23 GB` -> `2.23 GB`
- Hid redundant subtitles for aggregated apps (e.g. avoid `Chrome  Chrome`)
- Fixed UI behavior after killing a process (only removes the item and triggers "after kill" actions on success) and removed unused aggregation bookkeeping

## [Preferences] - 2026-02-04

- Added preference to skip kill confirmation dialogs

## [Fixes and Improvements] - 2026-01-13

- Added shortcut for the **Copy Path** action
- Added shortcut for the **Reload** action to the Windows version

## [Windows Fix] - 2026-01-12

- Fix powershell command on Windows by adding -NoProfile

## [Fixed Force Kill in MacOS] - 2025-12-16

- Fixed force kill for MacOS by encapsulating the kill command within a zsh shell

## [Windows Fix] - 2025-12-02

- Fix CPU and Memory values on Windows

## [AI Updates] - 2025-11-27

- Extract AI instructions from package.json into dedicated `ai.yaml` file
- Fix and clarify AI eval criteria wording, and improve the instructions for some edge cases

## [Windows Support] - 2025-08-29

- Add support for Windows

## [Added Force Kill] - 2025-06-10

- Force kills the chosen process with sudo (requires enabling sudo authentication with fingerprint)

## [✨ AI Enhancements] - 2025-02-21

- Added AI Extensions support allowing natural language interaction with the extension

## [Improvements] - 2024-09-05

- Adopted separate accessories for CPU and memory usage, including icons
- Added a dropdown to the command list for sorting processes by CPU or memory usage
- Added a section title for the command list
- Removed the checkmark emoji from toast message to avoid redundancy with the success toast style
- Shortened the extension description to fit the space of the Store extension
- Improved the description of preferences for better clarity

## [Back Root Search After Process Kiled] - 2024-03-01

- Added preference to go back to root search after a process is killed

## [Kill Multiple] - 2023-11-09

- Added preference to kill multiple processes without reopening Raycast

## [Sort by memory and App aggregation] - 2023-06-22

- Now can sort processes by CPU or memory usage
- Now can aggregate processes of the same app

## [Auto Refresh] - 2023-06-13

- Add auto-refresh of the list, check preferences

## [Filter by PID] - 2023-03-20

- Add filtering pid functionality

## [Kill Process Improvements] - 2021-10-27

- Some tweaks and adjustments behind the scenes

## [Add Extension] - 2021-10-25

- Add Kill Process extension
