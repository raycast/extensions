# Spotify Player Changelog

## [Version 2.1.1] - 2024-01-29

Sunset. Added a new view to let users know they must update.

## [Version 2] - 2023-04-27

### Spotify Player v2

Spotify Player first launched in October 2021. It was one of our first extensions, and to this day it stands as one of the most popular in the store. Since then, we've learned a lot, received plenty of feedback, and released new, more performant APIs.

So now it's time for a refresher ✨

Spotify Beta is a complete re-write, focusing on performance, maintainability, and user experience. One of our main goals was to keep the list of commands to a minimum but still allow users to tailor their own experience. This way, both new users of Raycast, as well as more advanced ones, can make the most of Spotify Player.

#### New Features

- Updated Extension icon
- Updated Menu Bar icon
- Support Podcasts and Episodes in "Now Playing"/"Menu Bar Player"
- Support Podcasts and Episodes in "Search"/"Your Library"
- Support "Transfer Playback" action, available in "Now Playing"/"Menu Bar Player"
- Support "Add to Playlist" action, available in "Now Playing"/"Menu Bar Player"

#### New Commands

- **Search:** A single unified search command. Use this to search for artists, albums, songs, playlists, podcasts, and episodes. Use the dropdown menu to filter your search to a specific category. Each category offers contextual actions, so you can dive deeper into the search.
- **Your Library:** Use this to see your saved artists, albums, songs, playlists, and podcasts. Similar to the "Search" command, it includes a category dropdown and contextual actions.
- **Quick Actions:** This is a list of lots of Spotify actions. For example: Play/Pause, Like/Dislike current song, Change Volume, and more. If you'd like to have any of these available as a Root Command, you can create Quicklinks via the actions menu (⌘ K).
- **Toggle Play/Pause:** Use this to toggle the playback of the current song.
- **Next:** Use this to skip to the next song/episode.
- **Previous:** Use this to skip to the previous song/episode.

#### Disabled Commands

This extension includes a few commands that are disabled by default. You can enable them by going to the extension's settings. These commands are:

- **Like:**
  Use this to like the current song.
- **Dislike:**
  Use this to dislike the current song.
- **Set Volume to 0%:**
  Use this to mute the volume.
- **Set Volume to 25%:**
  Use this to set the volume to 25%.
- **Set Volume to 50%:**
  Use this to set the volume to 50%.
- **Set Volume to 75%:**
  Use this to set the volume to 75%.
- **Set Volume to 100%:**
  Use this to set the volume to 100%.
- **Turn Volume Down:**
  Use this to turn the volume down by 10%.
- **Turn Volume Up:**
  Use this to turn the volume up by 10%.
- **Toggle Shuffle:**
  Use this to toggle shuffle.
- **Toggle Repeat:**
  Use this to toggle repeat.
- **Start Radio:**
  Use this to start a radio station based on the current song.
- **Copy URL:**
  Use this to copy the URL of the current song/episode.
- **Just Play:**
  Use this to quickly start playing a song based on your query.

#### Removed Commands

- **Search Artists:** Use "Search" instead. You can use the dropdown menu to narrow your search to artists only
- **Search Albums:** Use "Search" instead. You can use the dropdown menu to narrow your search to albums only
- **Search Tracks:** Use "Search" instead. You can use the dropdown menu to narrow your search to songs only
- **Search Playlists:** Use "Search" instead. You can use the dropdown menu to narrow your search to playlists only
- **Browse All:** Use the Spotify App instead
- **Featured Playlists:** Use the Spotify App instead

#### General improvements

- Menu Bar Player Preferences: "Max Text Length" has a default value of 20
- Menu Bar Player Preferences: "showEllipsis" setting has been removed. It'll always show ellipsis if the title needs to be truncated (based on the "Max Text Length" setting)

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
