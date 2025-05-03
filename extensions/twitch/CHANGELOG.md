# Twitch Changelog

## [OAuth & Rich Results] - 2023-12-21

- Added Twitch Oauth support
  - Uses the Twitch Oauth API instead of 3rd party services
  - Uses a Raycast proxy
  - Only requires users to input their Twitch username
- Added menubar item
  - Show how many followed channels are live
- Re-implemented `followed` command
  - Shows all followed channels, even when they are offline
  - Shows rich results, including screenshots and stream info
  - Shows detailed backlog of past streams (VODs)
- Improved existing commands
  - Use caching to improve performance
  - Use *frecency* sorting to improve results
  - Store past searches, displayed in the "empty search" state

## [Streamlink Bug Fix] - 2022-08-10

- Added better markdown support
- Added detail view
- Fixed streamlink errors
- Fixed low latency streams
- Removing unnecessary commands
- Added Success and Error Toasts and HUDs
- Added metadata for raycast store
- Optimizing + Refactoring + restructuring underlying codebase
- A lot of other small bug and QOL fixes + improvements


## [UI improvements] - 2022-05-10

- Updated deprecated functions
- Fixed empty state flicker
- Updated UI

## [Chore] - 2022-05-02

- Updated Raycast API to 1.33.2
