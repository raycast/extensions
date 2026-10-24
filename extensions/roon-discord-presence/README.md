# Roon Discord Presence for Raycast

Raycast front-end for [roon-discord-presence](https://github.com/alvinism/roon-discord-presence),
which shows what Roon is playing as your Discord Rich Presence.

## Commands

- **Menu Bar Status** — the track currently on your Discord status, with
  Start / Stop / Restart and Open Log. Refreshes every 10 seconds. Optionally shows the track
  title next to the icon (preference _Show track title in the menu bar_).
- **Show Status** — the current track with its cover, Roon and Discord connection
  state, all Roon zones, and the same controls.
- **Toggle Menu Bar Icon** — hide or show the menu bar icon. The same switch is in the menu
  itself (_Hide Menu Bar Icon_) and in the status view (⌘⇧M). Running the menu bar command
  from Raycast also brings a hidden icon back.

Menu bar commands appear after you run them once from Raycast. If you use a menu bar manager
(Bartender, Ice…), new icons may land in its hidden section — set the Raycast item to _Shown_.

## Requirements

The command line tool must be installed and set up:

```sh
uv tool install 'roon-discord-presence[s3]'
roon-discord-presence setup
```

The extension looks for it in `~/.local/bin`, `/opt/homebrew/bin` and `/usr/local/bin`; set
_Path to CLI_ in the extension preferences if it lives elsewhere.

## Development

```sh
npm install
npm run dev     # imports the extension into Raycast and rebuilds on change
npm run lint
```
