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
| Play / Pause   | Toggle playback on the active player                                        |
| Next Track     | Skip forward on the active player                                           |
| Previous Track | Return to the previous track on the active player                           |
| Volume Up      | Increase volume by 5% on the active player                                  |
| Volume Down    | Decrease volume by 5% on the active player                                  |
| Toggle Mute    | Toggle mute on the active player                                            |

## Music Workspace

Use the dropdown beside the search bar to switch between **All**, **Favorites**, **Players**, **Tracks**, **Artists**, and **Albums**. All begins with your active player, followed by other available players, artists, tracks, and albums. On a fresh launch, this puts your saved available output first for immediate volume/mute control. Highlighting another player still targets that player for volume/mute, while transport controls use your saved output. Artist and album views use cover grids. Opening an artist shows albums and tracks together on one searchable screen.

Players separates available outputs, compatible synced group members, and offline outputs. Select your primary output first, then press Enter on a compatible player in the Group Players section to add it. Linked members have a removal action. Group controls depend on the server's reported capabilities; Sendspin endpoints must already be connected to Music Assistant.

Press Enter to select a player, play a track immediately, or browse an artist or album. Open Raycast's action panel for Now Playing details, Play Next, Add to Queue, repeat, shuffle, mute, volume, transport controls, queue inspection, and refresh.

### Favorites

Choose **Favorites** to browse tracks, artists, and albums marked as favorites in Music Assistant. Search stays within your favorites, and all three sections load additional pages as you scroll. Enter plays a track or opens an artist/album; your existing queue and playback shortcuts work here too.

Mark favorites in Music Assistant, then use **Refresh** in the Favorites view to pick up changes. This view does not add or remove favorites. If a section cannot load, the other results remain available with a warning and Refresh recovery. A server that cannot return confirmed favorites reports an error rather than showing an unfiltered library. Demo Mode includes a small fictional favorites selection.

### Default Shortcuts

| Action                | macOS                 | Windows                | Notes                               |
| --------------------- | --------------------- | ---------------------- | ----------------------------------- |
| Play/Pause            | `Alt + Enter`         | `Alt + Enter`          | Targets active player               |
| Next Track            | `Alt + .`             | `Alt + .`              | Forward track skip                  |
| Previous Track        | `Alt + ,`             | `Alt + ,`              | Previous track skip                 |
| Play Next             | `Cmd + Option + N`    | `Ctrl + Alt + N`       | Enqueue to play next                |
| Add to Queue          | `Alt + A`             | `Alt + A`              | Append to active queue              |
| Browse Artist         | `Cmd + Space`         | `Ctrl + Space`         | Open artist collection              |
| Browse Album          | `Cmd + Shift + Space` | `Ctrl + Shift + Space` | Open album tracklist                |
| Volume Up / Down (5%) | `Alt + =` / `Alt + -` | `Alt + =` / `Alt + -`  | Targets highlighted/active player   |
| Mute / Unmute Player  | `Alt + M`             | `Alt + M`              | Contextual toggle with dynamic icon |
| Show Queue            | `Alt + Q`             | `Alt + Q`              | Open queue inspection               |
| Now Playing           | `Alt + I`             | `Alt + I`              | Open Now Playing detail view        |
| Toggle Shuffle        | `Alt + S`             | `Alt + S`              | Feedback toast: On / Off            |
| Toggle Repeat         | `Alt + R`             | `Alt + R`              | Cycles Track → Queue → Off          |
| Refresh               | `Cmd + R`             | `Ctrl + R`             | Refresh library/player state        |
| Keyboard Shortcuts    | `Cmd + Shift + .`     | `Ctrl + Shift + .`     | Open the shortcut editor (fixed)    |
| Extension Preferences | `Cmd + .`             | `Ctrl + .`             | Non-configurable                    |

### Customize Shortcuts

Open **Music → action panel → Keyboard Shortcuts**, or press **Cmd + Shift + .** on macOS / **Ctrl + Shift + .** on Windows. Search the grouped list for an action and press Enter to edit its modifier, optional additional modifier, and key. The list shows the complete shortcut and whether it is Default or Custom. Save applies changes throughout Music; Escape cancels the edit.

Use **Restore Default** for one action or **Restore All Defaults** (with confirmation) for the complete set. Invalid combinations, protected Raycast/text-editing keys, and shortcuts already assigned to another Music action are explained before saving. If another action is using a default you want to restore, change that action first or restore all defaults.

All existing default bindings are unchanged. On first launch after this update, review your bindings in Keyboard Shortcuts: old custom values are imported if Raycast still exposes them, but removed preference fields may no longer be available. Reapply any missing customization, then choose **Mark Shortcuts Reviewed** to dismiss the reminder.

Extension Preferences still opens with **Cmd + . / Ctrl + .** and contains only the server URL, password token, and Demo Mode. Shortcut overrides are stored locally for this extension and shared between live and demo Music views; they do not contain connection details. Global hotkeys that launch the seven commands remain configured in Raycast.

## Demo Mode

Enable Demo Mode in extension preferences to explore the interface with fictional players and music. Demo Mode produces no audio and its in-memory queues reset when Music closes.

## Development

- [Development guide](docs/DEVELOPMENT.md): WSL setup, product decisions, shortcuts, architecture, API contract, and publishing.
- [Status and validation](docs/STATUS.md): implemented features, release evidence, known limitations, and remaining checks.
