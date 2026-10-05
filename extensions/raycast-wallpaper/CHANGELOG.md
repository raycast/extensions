# Raycast Wallpaper Changelog

## [Fix memory limit when setting HEIC wallpapers on Windows] - {PR_MERGE_DATE}

- Convert HEIC wallpapers to PNG instead of JPEG on Windows. The JPEG conversion of a full-resolution wallpaper exceeded the extension memory limit.

## [Fix Windows wallpapers and improve reliability] - 2026-10-01

- Convert HEIC wallpapers to full-resolution JPEGs on Windows to prevent blank backgrounds.
- Fix opening the wallpaper folder when no directory is configured, and create missing download folders.
- Download wallpapers on demand and report download and wallpaper-setting failures.
- Retry failed automatic switches without waiting for the full refresh interval.
- Fix Windows dark-mode detection and appearance settings for newer wallpapers.
- Fix gallery selection and loading indicators, and clarify the All Monitors option.
- Report an error when the current monitor cannot be found.

## [Add Ask AI Support] - 2026-09-30

- Add Ask AI support to list official Raycast wallpapers and set a wallpaper by name on all monitors or the current monitor.
- Add AI instructions and YAML evals for listing, setting, and unavailable wallpapers.
- Return an error on Windows when the current monitor cannot be identified or matched, instead of reporting wallpaper-setting success.

## [Update default setting] - 2025-06-24

- Update default setting of `Respect System Appearance` to `false` for "Set Raycast Wallpaper" command.

## [More Auto Switch Interval] - 2025-06-23

- Auto Switch Raycast Wallpaper command supports more intervals
- Set Raycast Wallpaper command respects the system appearance
- Optimize extension icons for macOS Tahoe

## [Respect system appearance] - 2025-04-30

- Support to set whether the wallpaper is Light or Dark appearance wallpaper.
- Support to set whether the Auto Switch Raycast Wallpaper command respects the system appearance

## [Remove error dialog] - 2024-09-30

- Remove error dialog that pops up not as expected

## [Auto Switch Wallpaper command] - 2024-06-12

- Preference for refresh intervals mirroring Apple wallpaper shuffle intervals

## [Fix typo] - 2024-05-31

- Fix typo in `Set Raycast Wallpaper` command configuration.
- Fix `npm audit` issue.

## [Detailed Optimisation] - 2024-05-30

- Optimization of details
- Use smaller thumbnails for improved loading speed in grid/list view

## [Improve image loading speed] - 2024-03-06

- Use smaller thumbnails for improved loading speed in grid/list view

## [Support new wallpapers] - 2024-03-05

- Add support for other image formats (e.g. heic)

## [Exclude from Auto Switch] - 2023-08-21

- Add a new action for Set Raycast Wallpaper: Exclude from Auto Switch

## [Update grid layout] - 2022-10-15

- Update grid layout

## [Add automatic wallpaper switching function] - 2022-08-12

- Change command [Random Raycast Wallpaper] to [Auto Switch Raycast Wallpaper] that will automatically switch random wallpaper every 1 hour when you call it first

## [Add new wallpaper layout options] - 2022-06-09

- Add new wallpaper layout options: List or Grid.
- Optimize list loading speed

## [Optimize image loading speed] - 2022-05-23

- Optimize image loading speed
- Add action "Open Extension Preferences"

## [Update Extension Icons] - 2022-04-26

- Update Extension Icons
- Add preference Screenshots Directory, you can set the directory where the screenshots are saved

## [Fix Text Error] - 2022-04-20

- Fix text error

## [Added Raycast Wallpaper] - 2022-04-12

- Release of Raycast Wallpaper version 1.0
- **Set Raycast Wallpaper**: Get and set Raycast wallpapers to desktop.
- **Random Raycast Wallpaper**: Set random Raycast wallpapers to desktop.
