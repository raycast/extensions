# Audio Assistant

Audio Assistant is a keyboard-first Music Assistant remote for Raycast on Windows and macOS. Browse your library, select a player, control playback, and manage the active queue from one **Music** workspace.

## Setup

Audio Assistant connects directly to an existing Music Assistant server.

1. Open Audio Assistant's extension preferences in Raycast.
2. Enter the Music Assistant server URL, including the port or reverse-proxy base path.
3. Create a long-lived access token under **Music Assistant → Settings → Users → Tokens**, then paste it into the password preference.
4. Open **Music**, highlight an available player, and press Enter to make it active.

The active player is saved separately for each Music Assistant server and user. Audio Assistant never silently selects or switches playback to another player.

## Commands

| Command        | Purpose                                                                     |
| -------------- | --------------------------------------------------------------------------- |
| Music          | Search players, artists, tracks, and albums; control playback and the queue |
| Play/Pause     | Toggle playback on the active player                                        |
| Next Track     | Skip forward on the active player                                           |
| Previous Track | Return to the previous track on the active player                           |

## Music Workspace

Use the dropdown beside the search bar to switch between **All**, **Players**, **Tracks**, **Artists**, and **Albums**. All begins with individual players, followed by artists, tracks, and albums. Artist and album views use cover grids, while Players provides an expanded status view.

Press Enter to select a player, play a track immediately, or browse an artist or album. Open Raycast's action panel for Play Next, Add to Queue, repeat, shuffle, mute, volume, transport controls, queue inspection, and refresh.

Volume shortcuts are `Ctrl+=` and `Ctrl+-` on both Windows and macOS. Playback and track actions always target the saved active player; volume actions target a highlighted player when applicable.

## Demo Mode

Enable Demo Mode in extension preferences to explore the interface with fictional players and music. Demo Mode produces no audio and its in-memory queues reset when Music closes.

## Development

Contributor architecture, WSL setup, protocol notes, and validation records are available in the [`docs`](docs) directory.
