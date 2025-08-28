# Spotify Player Changelog

## [Fix Add Playing Song to Playlist Command Using Cached Data] - 2025-08-28

- Fixed race condition in Add Playing Song to Playlist command to properly wait for currently playing data to load
- Improved error handling with proper loading state checks to prevent using stale cached data
- Enhanced user feedback with loading indicators and error messages

## [Include option to prevent duplicate songs in Add to Playlist command] - 2025-08-25

- Introduced an option allowing users to choose whether to allow duplicate songs to be added to their playlists

## [Fix reading values from possibly undefined objects] - 2025-08-22

- Remove unneeded `.tool-versions`
- Fix reading values from possibly undefined objects
- Bump dependencies to the latest & fix linting issues

## [Show the Artist name when liking a song] - 2025-08-04

- Added the artist name into the message in the HUD when liking a new song
- Added the artist name into the message in the HUD attempting to like an already liked song

## [Add toggle to filter song name in menu bar] - 2025-07-08

- Added new toggle for removing extra info like remix titles or versions from the song name in the menubar

## [Fix Search Feature] - 2025-07-03

- Fixed an issue with the search functionality.

## [Fix Noises and Additional data in Find Lyrics Function] - 2025-07-02

- Fixed Noises in retrieved lyrics in Find Lyrics Function,now clean lyrics is extracted without any additional noise or data like contributors count and numbers

## [Add Option to View the Lyrics of the Song playing] - 2025-06-30

- Add new command 'Find Lyrics'.
- Add an option that allows users to See the current song’s Lyrics, artist and title.

## [Add Option to Copy the Current Song’s Artist and Title] - 2025-05-26

- Add new command 'Copy Artist And Title'.
- Add an option in the `NowPlaying` command that allows users to copy the current song’s artist and title.

## [Fix AppleScript fallback for non-premium users] - 2025-05-21

- Fixed AppleScript fallback for functions that use premium-only API endpoints. Most commands now work without a premium subscription except queuing, cycleRepeat (AppleScript can only toggle context off/on) and device selection.

## [✨ AI Enhancements] - 2025-04-30

- Added AI queue interaction (e.g.,"@spotify add 10 random jazz songs to my queue").

## [Fix Select Device] - 2025-02-26

- Fixed a possibly undefined issue from Select Devices command

## [✨ AI Enhancements] - 2025-02-21

## [Fix Missing Playlists in Add Playing Song to Playlist command] - 2025-02-20

- Fixed an issue where some playlists were not appearing when users attempted to add a currently playing song to a playlist.

## [Add Copy Embed Code Command] - 2025-02-20

- Added a new command to copy the iframe embed code for the currently playing song.

## [Add "Skip 15 Seconds" and "Back 15 Seconds" commands] - 2025-02-18

- Added the ability to skip forward or back 15 seconds in the current episode. This adds two new commands as well as two new menu bar items which only show when an 'episode' is playing.

## [Artist Name Visibility Option] - 2025-02-07

- Added the option to hide the artist's name in the Menu Bar Player.

## [Fix Your Library] - 2025-02-04

- Fix a possibly null issue from `getMeAlbums` API.

## [Generate Playlist Improvement - Artists] - 2024-12-03

- Modify the prompt so if the description contains "songs from: artist1, artist2, etc" it will only generate a playlist using those artists

## [Fix Search Command] - 2024-11-22

- Even though it's not documented, the Spotify API can return null items in some cases when searching for items. This has now been fixed.

## [Minor Fixes] - 2024-09-20

- Fixed an issue when "Nothing is playing" popped up after commands `next`, `previous` and `like` having `Current Track` command disabled

## [Generate Playlist Improvement] - 2024-09-06

- Use GPT-4o mini instead of GPT-4o to make it faster.

## [Add "Start DJ" Command] - 2024-09-05

- Added a command to start the DJ using AppleScript, because the Spotify API doesn't support it.

## [Quicklink to Add Playing Song to Playlist] - 2024-08-29

- Adds an action to create a quicklink to add the currently playing song to a specific playlist.

## [Add Preference to Only Show Music in Search Command] - 2024-08-26

- Added a preference to only show music results in the search command for users who don't want to see podcasts and episodes.

## [Add "Remove All Searches" Action in Search Command] - 2024-08-22

- Added `Remove All Searches` action to remove all search history in one click.

## [Log out the user if re-authentication fails] - 2024-07-11

- Automatically log out users if re-authentication fails, instead of displaying an error message.

## [Generate Playlist Fixes] - 2024-06-11

- Removed automatic copying to clipboard after AI generates a result.
- Improved the error message displayed when the playlist generation fails.

## [Generate Playlist] - 2024-06-04

- Added a new feature where Raycast AI can create a playlist for you. You can then add this playlist to Spotify or queue all the songs directly.

## [New Album Actions] - 2024-05-30

- Added new actions in the album panel: `Add To Library` and `Remove From Library`.

## [Automatically Trigger Current Track] - 2024-05-28

- Automatically trigger the current track command when commands that modify the current track state are executed. (Like, Unlike, Next, Previous).

## [New Actions Added] - 2024-05-27

- Added `Like` and `Dislike` actions for tracks.

## [Improvements] - 2024-05-27

- Users can now set their preferred first section for search results.
- Added a new keyboard shortcut for "Add to queue".

## [New "Remove Playing Song from Playlist" command] - 2024-05-27

- New command `Remove Playing Song from Playlist` to remove the current song from the playlist it's in.

## [New "Add Playing Song to Playlist" command] - 2024-02-02

- New command `Add Playing Song to Playlist` to directly add the current song to a playlist of your choice.
- Removed the condition to filter collaborative playlists from other users, since Spotify doesn't update it correctly.

## [New "Queue" Command] - 2023-01-31

- New `Queue` command allowing the user to view songs/epsiodes in the queue.

## [Bug fixes] - 2024-01-31

- Fixed a bug that caused launching the Spotify app to not work properly
- Modified the device selection preference for playback

## [Improvement] - 2024-01-30

- Increase the stale data time from 10 minutes to 2 hours

## [Fix Current Track Like State] - 2023-12-31

- Fix showing the like/disliked state of the current track

## [Feature & Optimisation] - 2023-12-02

- Added `Select Device` command to select the device to play music on.
- Automatically select a device when no device is selected.
- Better handling when no device is found or Spotify is not installed.
- Informative error toast messages.
- Show songs for the `Liked Songs` playlist.
- Fix uri for `Liked Songs` playlist.

## [Feature] - 2023-09-29

- Show a Liked Songs playlist in search and library commands.

## [More Commands] - 2023-09-07

- Added `Current Track` command to view the current track and artist/show, and the like state
- Added `Replay` command to go to the beginning of the song, replaying it
- Added `Set Volume` command to set the volume to an arbitrary percent, using an argument
- Renamed `Toggle Repeat` to `Cycle Repeat` command to cycle between all three repeat states instead of just two states

## [Feature] - 2023-07-31

- New Menu Bar Player preference to hide the icon when Spotify is not running, or when there is nothing playing.

## [Typo] - 2023-07-27

- Fixed a bug that showed 25% when setting the volume to 75%

## [Optimisation] - 2023-07-07

This update introduces a few optimisations to the Menu Bar Command. We've reduced the number of API calls, and we've also reduced the number of requests to the Spotify API. This should result in a faster and more responsive experience.

In order to achieve this, the extension now checks the Spotify Application for the current state of the player. This means that we only need to make API calls when the state changes. With this approach, you can still listen and control Spotify from any connected device.

Please note because of this, it's now required to have the Spotify Application running.

## [Version 2] - 2023-06-19

### Spotify Player v2

Spotify Player first launched in October 2021. It was one of our first extensions, and to this day it stands as one of the most popular in the store. Since then, we've learned a lot, received plenty of feedback, and released new, more performant APIs.

So now it's time for a refresher ✨

Spotify Player v2 is a complete re-write, focusing on performance, maintainability, and user experience. One of our main goals was to keep the list of commands to a minimum but still allow users to tailor their own experience. This way, both new users of Raycast, as well as more advanced ones, can make the most of Spotify Player.

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
