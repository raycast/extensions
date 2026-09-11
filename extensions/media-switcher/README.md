<p align="center">
  <img src="assets/extension-icon.png" width="64" alt="">
  <h1 align="center">Media Switcher</h1>
</p>

A keyboard-driven [Raycast](https://raycast.com) extension for managing all of your active media sessions from one place — no more hunting through open apps and browser tabs to switch from a YouTube video to a Spotify song.

## Commands

| Command | Description |
| --- | --- |
| Switch Media | Switch media sessions, play, pause, skip to previous / next track, control volume and reveal app |

## Actions

| Action | macOS Shortcut | Windows Shortcut | Description |
| --- | --- | --- | --- |
| Switch to This Session<sup>1</sup> | `↵` | `↵` | Pause all other sessions and switch to this session |
| Play / Pause | `↵` or `⌘` `↵`<sup>2</sup> | `↵` or `Ctrl` `↵`<sup>2</sup> | Play / pause this session |
| Previous Track | `⌘` `[` or `⌘` `←`<sup>3</sup> | `Ctrl` `[` or `Ctrl` `←`<sup>3</sup> | Skip to the beginning of the current or previous track |
| Next Track | `⌘` `]` or `⌘` `→`<sup>3</sup> | `Ctrl` `]` or `Ctrl` `→`<sup>3</sup> | Skip to the next track |
| Reveal Application | `⇧` `↵` | `⇧` `↵` | Bring the active media application to the foreground |
| Copy Track Info | `⌘` `⇧` `C` | `Ctrl` `⇧` `C` | Copy the track title and artist |
| Turn Volume Up | `⌘` `=` | `Ctrl` `=` | Raise the system volume level |
| Turn Volume Down | `⌘` `-` | `Ctrl` `-` | Lower the system volume level |
| Refresh | `⌘` `R` | `Ctrl` `R` | Refresh the media session list |

1. This action is not available for playing sessions.
2. `↵` when controlling a playing session; `⌘` `↵` / `Ctrl` `↵` when controlling a non-playing session.
3. The shortcut depends on your preference: use square brackets or arrow keys.

## Preferences

| Name | Default | Description |
| --- | --- | --- |
| Previous / Next Track Shortcuts | ⌘ / Ctrl and Square Brackets [ ] | Choose shortcuts for the "Previous Track" and "Next Track" actions |
| Refresh Interval (seconds) | 5 | How often to auto-refresh the media session list. Set to 0 to disable |
| Volume Step | 5 | How much to increase or decrese the volume by |

## Notes

macOS support is intended but not yet implemented because I don't have a Mac to test on. Contributions adding macOS support via PRs are very welcome :)

## Issues

If any issues persist, feel free to [contact me](https://x.com/muhammadrizo_y)