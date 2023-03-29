# Spotify Player Changelog

## [Version 2] - 2023-03-27

### Spotify Player v2

Spotify Player first launched in October 2021. It was one of our first extensions, and to this day it stands as one of the most popular in the store. Since then, we've learned a lot, received plenty of feedback, and released new, more performant APIs.

So now it's time for a refresher ✨

Spotify Player v2 is a complete re-write, focusing on performance, maintainability, and user experience. One of our main goals was to keep the list of commands to a minimum but still allow users to tailor their own experience. This way, both new users of Raycast, as well as more advanced ones, can make the most of Spotify Player.

#### New Commands

- **Search:** A single unified search command. Use this to search for artists, albums, songs, playlists, podcasts, and episodes. Use the dropdown menu to filter your search to a specific category. Each category offers contextual actions, so you can dive deeper into the search.
- **Your Library:** Use this to see your saved artists, albums, songs, playlists, and podcasts. Similar to the "Search" command, it includes a category dropdown and contextual actions.
- **Quick Actions:** This is a list of lots of Spotify actions. For example: Play/Pause, Like/Dislike current song, Change Volume, and more. If you'd like to have any of these available as a Root Command, you can create Quicklinks via the actions menu (⌘ K).

#### New Features

- Extension icon
- Menu Bar icon
- "Transfer Playback" action, available in "Now Playing"/"Menu Bar Player"
- "Add to Playlist" action, available in "Now Playing"/"Menu Bar Player"
- Support Podcasts and Episodes in "Now Playing"/"Menu Bar Player"
- Support searching for Podcasts and Episodes
- "Max Title Length" now has a default value of 30

#### Removed Commands

- **Just Play:** Use "Search" instead. If you'd like quick access to search, you can assign it a hotkey
- **Search Artists:** Use "Search" instead. You can use the dropdown menu to narrow your search to artists only
- **Search Albums:** Use "Search" instead. You can use the dropdown menu to narrow your search to albums only
- **Search Tracks:** Use "Search" instead. You can use the dropdown menu to narrow your search to songs only
- **Search Playlists:** Use "Search" instead. You can use the dropdown menu to narrow your search to playlists only
- **Start Radio:** Available as an action under "Now Playing"/"Menu Bar Player" or in "Quick Actions"
- **Like Current Song:** Available as an action under "Now Playing"/"Menu Bar Player" or in "Quick Actions"
- **Dislike Current Song:** Available as an action under "Now Playing"/"Menu Bar Player" or in "Quick Actions"
- **Dislike Current Song:** Available as an action under "Now Playing"/"Menu Bar Player" or in "Quick Actions"
- **Browse All:** Use the Spotify App instead
- **Featured Playlists:** Use the Spotify App instead

We hope you enjoy the new and improved Spotify Player Extension — we've [obsessed over every detail](https://twitter.com/peduarte/status/1638101325312577536).

## [Fix] - 2023-01-13

- Allow no-view commands (`Like Current Song`, `Dislike Current Song`, `Just Play` and `Star Radio`) to initialize authorization.

## [Feature] - 2022-12-06

- Change background refresh interval to keep the menu bar in a more updated state

## [Feature] - 2022-11-17

- Add preference to show ellipsis when menu bar title is truncated.

## [Fix] - 2022-11-14

- Fixed a bug that caused `Like Current Song` and `Dislike Current Song` to not function properly.

## [Fix] - 2022-10-28

- Fixed a bug that caused the menubar command to not function properly.

## [Feature] - 2022-10-07

- Implemented add track to queue, can be located in Search Tracks view

## [Feature] - 2022-09-12

- Introduce new command "Dislike Current Song"
- Added dislike action for menu bar

## [Feature] - 2022-08-08

- Introduce new command "Now Playing" to view the current track inside Raycast (and renamed the existing menu bar command to "Now Playing Menu Bar")
- Introduce new command "Featured Playlists"
- Introduce new command "Browse All"

## [Bug Fixes] - 2022-08-01

- Properly handled states for unauthorized state in menu bar and no-view commands
- Added tooltips for menu bar command actions
- Menu bar title will now be updated after performing `Next/Previous Track` actions

## [Features & Bug Fixes] - 2022-07-27

- Added Play Shuffled actions to `Search Playlist`, `Search Albums` commands
- Supported start cross-device playing. Means that if you have the music playing not on your machine - the play actions will trigger playing music whenever you have it.
- Fixed flickering for menu bar items

## [Features & Bug Fixes] - 2022-07-30

- Fixed cases when the Spotify app named not "Spotify" and most of the command didn't work
- `Search Albums` command now is a Grid
- Fixed subtitle updates when there is no Spotify playing

## [Feature] - 2022-07-24

- Add max. length preference for menubar item

## [Feature] - 2022-07-21

- Introduce new command "Just Play"
- Introduce new command "Now Playing" with menu-bar 🔥
- Introduce new command "Play Similar"

## [Feature] - 2022-05-24

- Added OAuth Support
- Introduce new command "Like Curent Song"
- Introduce new command "Search Artists"
- Redesign for existing commands, add feature to preview albums

## [Feature] - 2022-05-23

- Added the ability to open via the Spotify app instead of always using Spotify Web for everything

## [Feature] - 2022-04-26

- Added playlist and album search

## [Metadata] - 2022-03-23

- Added screenshot, changelog and categories for better discoverability

## [Initial Version] - 2021-10-13
