# Spotifast

Control [Spotifast](https://spotifast.rocks/), the native Spotify client, from Raycast.

## Commands

- **Menu Bar Player**: the playing track in the menu bar, with play/pause, next, previous, Like, shuffle, repeat, volume and device controls.
- **Play / Pause**, **Next Track**, **Previous Track**
- **Skip Forward** and **Skip Backward**: 15 seconds, or the number of seconds you type.
- **Increase Volume** and **Decrease Volume**: 10 percent, or the amount you type.
- **Set Volume**, **Toggle Mute**
- **Toggle Shuffle**, **Cycle Repeat**
- **Like / Unlike Track**: save the playing track to Liked Songs, or remove it.
- **Switch Device**: move playback to another Spotify Connect device.
- **Open Spotifast**: bring the window forward, starting the app if needed.

## Requirements

Spotifast 0.3.0 or later (named Fastpotify before 0.8.0), running and signed in. The commands talk to the running app through its command-line interface, so no Spotify API setup is needed.

The extension looks for Spotifast in `/Applications` and `~/Applications`, and for the `spotifast` command in Homebrew, Cargo and Nix locations. If yours is elsewhere, set **Spotifast Binary** in the extension preferences.
