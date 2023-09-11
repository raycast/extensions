# YouTube Changelog

## [Enhancements] - 2023-06-20

- Added video duration info on details view

## [Update] - 2023-06-15

- Add support for fallback commands

## [Enhancements] - 2023-04-18

- Bug fixes for recent and pinned items not updating correctly
- Recent items were not being added until relaunching the command
- Pinned items were not being added to the front
- Now all actions for videos and channels will add them to the recent list
- Added new empty view

## [Enhancements] - 2023-04-13

- Optimized the experience
- Using cache instead of local storage
- Using a 4/3 aspect ratio for videos

## [Search From Root] - 2023-02-08
- Add query parameter to Search Videos and Search Channels commands

## [README update] - 2023-01-17
- Fixed path to API

## [Fix Crash] - 2022-11-21
- Fix crash when video title contain unusual characters

## [IINA] - 2022-11-01
- Add correct appid for IINA otherwise the browser will be opened instead of IINA
- Upgrade to Raycast 1.42

## [Updates] - 2022-07-08

- Added optional grid view. 
- Fixed title bug by decoding the HTML video and channel titles.
- Added pinned and recent items for videos and channels.
- Added metadata to video and channel detail views.
