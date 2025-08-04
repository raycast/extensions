# Apple Music Changelog

## [New Command] - 2025-08-04

- Added a new command that removes the currently playing track from the Library.

## [New Config] - 2025-06-30

- Added a new configuration option to disable HUDs

## [Update Rate Track] - 2025-03-10

- Added the track name to the `Rate Track` command.

## [New Command] - 2025-03-04

- Added new "Toggle Repeat" command.

## [AI Enhancements] - 2025-02-21

- Added AI extensions to the Music extension.

## [Update Currently Playing] - 2024-12-13

- Fixed a bug where `Currently Playing` command would open the Music app if it was not running.

## [Update Currently Playing] - 2024-12-06

- Update `Currently Playing` command to show the currently playing track in the subtitle instead of the toast.

## [New Command] - 2024-02-10

- Added a new command that removes the currently playing track from the current playlist and skips to the next track.

## [Update] - 2023-10-12

- Added macos version check in the "favorite" command in order to make it compatible with version older than Sonoma.

## [Update] - 2023-10-11

- Apple recently updated Music and renamed the "love" functionality to "favorite". This updates the necessary commands for that.

## [Fix `start-playlist`] - 2023-08-31

- Fixed a bug in `start-playlist` where item title could be empty or undefined.

## [Dislike & Skip] - 2023-08-10

- Add command to dislike and then skip a track

## [Fix] - 2023-08-05

- Fixed HUD confirmations from showing an unknown character
- Swapped deprecated 'accessoryTitle' to 'accessories' in lists

## [Fix] - 2023-06-12

- Fixed a few bugs that caused some commands not to open correct

## [Update] - 2023-05-03

- This adds the currently playing track in Play Library Track

## [Update] - 2023-04-10

- Improved search to match Apple Music behaviour

## [Fix] - 2023-03-23

- Added fallback scripts to commands that were interacting with the library.

## [Update] - 2023-03-13

- Fixed a localization bug

## [Update] - 2023-03-01

- Fixed dislike song command

## [Updates] - 2023-02-10

- Fixed typo on "add to playlist"

## [Updates] - 2023-02-05

- Re-enabled "add to playlist"

## [Update & Fixes] - 2023-01-24

- `Set Volume` - Fixed volume argument behaviour
- `Toggle Shuffle` - New commmand

## [Updates & Fixes] - 2023-01-20

- Updated volume behaviour, the user can now choose the size of the volume increment/decrement from preferences
- Disabled "add to playlist" due to incorrect behaviour.
- Removed amperstand from search params

## [Update] - 2023-01-17

- Added "add to playlist" command, it prompts the user to add currently playing track to a playlist.
- Added volume controls: "volume up/down" and "set volume" (scale from 0 to 100)

## [Update] - 2022-11-21

- Fixes the command "Love track" so it loves the track instead of adding to library.

## [Update] - 2022-10-29

- Fixed "Add to Library" script.
- Improved error handling
- Added "Reveal Track" command

## [Update] - 2022-07-27

- Improved error reporting
- New README and screenshots

## [Update] - 2022-07-15

Squashed a few bugs in "Play Library Album"

## [Shuffle Playlist/Album] - 2022-06-01

- Ability to shuffle an album
- Ability to shuffle a playlist
- Renamed "Search & Play Library Album" to "Play Library Abum"
- Renamed "Search & Play Library Track" to "Play Library Track"

## [Fix] - 2022-05-30

Fixed issue that caused the extension to crash

## [Track Rating / Fixes] - 2022-05-05

- Fixed issue #1294
- Added song rating #1568
- Refactored some `AppleScript` code

## [Search/Play Playlist Feature] - 2022-03-17

Added new search and play playlist feature to extension

## [New Commands] - 2021-12-20

Add commands to love, and add the currently playing track to your library

## [Love & Dislike] - 2021-11-30

Adds love/dislike to Apple Music extension

## [Initial Version] - 2021-11-18

Add Music extension
