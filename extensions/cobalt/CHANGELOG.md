# Cobalt Changelog

## [Download History command and improvements] - 2025-06-27

- Added `Download History` command (Thanks @ripgrim!)
- Minor under-the-hood improvements

## [General improvements, API update] - 2024-11-20

- Updated dependencies
- Updated default API instance URL to `cobalt.aelew.dev` (see [imputnet/cobalt#860](https://github.com/imputnet/cobalt/discussions/860))
- Updated download logic to be compatible with the latest API version (v10.3.3)
- Added a toast notifying the user if they are using an old API instance URL
- Added `API Instance Key` preference
- Added `Always Proxy` preference
- Added `Disable Metadata` preference
- Added `YouTube: Use HLS` preference
- Removed `Mute Video Audio` preference (now under `Mode`)

## [Bug fixes and improvements] - 2024-08-16

- Updated dependencies
- Updated default API instance URL to `api.cobalt.tools`
- Fixed file names not being parsed properly sometimes
- Added `144p` and `240p` video quality options
- Added `Twitter: Convert GIFs to .gif` preference
- Added `TikTok: Prefer H.265/HEVC Videos` preference
- Removed `Vimeo Download Type` preference (no longer supported)
- Removed `Remove TikTok and Douyin Watermarks` preference (no longer supported)

## [Improvements] - 2023-10-30

- Added new `File name style` preference
- Added additional error handling
- Updated dependencies

## [Initial release] - 2023-07-30

Cobalt for Raycast is here!
