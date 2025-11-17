# Tidal Controller Changelog

## [Now Playing Support] - 2025-04-09

- Added now playing command that displays a message of the currently playing song
- Added menu bar that shows the tidal logo & if available currently playing song.
  - If song title is not available (closed, paused, window closed) it will just display the Tidal logo and link to open
  - If song title is available, other commands are presented (pause, skip, etc.)

## [Volume Control Support] - 2025-03-31

- Added volume up and down control. This allows for users to bind Tidal-only volume control to a hotkey.

## [Additional Language Support] - 2024-09-06

- Added proper support for all Tidal languages. This will enable users of those languages to use the extension. For this extension to work, you must select the same language in Raycast as you have selected in Tidal.

## [Initial Version] - 2024-08-19

This is the first version of the Tidal Controller extension. This release includes only a few simple commands to control Tidal with:

- Play current track
- Pause current track
- Toggle Play/Pause of current track
- Toggle shuffle mode
- Play next track
- Restart or play previous track

I have plans to expand this extension in the future to control more of Tidal's features. Tidal's app, sdk, and api are all fairly limited still so I'll be bugging the Tidal team to expand them.
