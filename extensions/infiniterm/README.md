# Infiniterm for Raycast

Open Finder folders in [infiniterm](https://github.com/ekinertac/infiniterm) as terminal cards, in a workspace you pick or a new one. The extension drives the app through its `ift` command line tool.

## Requirements

- macOS with Raycast.
- Infiniterm 0.6.4 or newer, installed. It ships the `ift` tool at `/Applications/infiniterm.app/Contents/MacOS/ift`. `ift install` links it into `~/.local/bin`, and a Homebrew install links it into `/opt/homebrew/bin`.

On an older infiniterm the commands that need newer `ift` verbs (the workspace picker and Go to Card) detect that and say so. The rest keep working: the workspace list then shows only "Current Workspace".

## Commands

- **Open in Infiniterm**: takes the folders selected in Finder (a selected file counts as its parent folder). With nothing selected it uses the front Finder window's folder, then the Desktop. It lists your workspaces plus "New Workspace" (with an optional name) and opens a terminal card per folder in the one you choose. The last workspace you used is listed first.
- **Open in Infiniterm (Current Workspace)**: the same folders, no picker, on the workspace on screen.
- **New Terminal Card**: asks for a directory (home by default), then for a workspace. Cmd+Enter continues to the workspace picker, and Cmd+Shift+O skips it and uses the workspace on screen.
- **Open File in Infiniterm**: the file selected in Finder as an editor card of its own.
- **Open Git Diff in Infiniterm**: the git changes of the Finder selection, or of the front Finder window's folder, as a diff card.
- **Open Infiniterm Settings File** and **Open Infiniterm Keybindings File**: `~/.config/infiniterm/settings.json` and `keybindings.json` as editor cards. If you start the app with `INFINITERM_CONFIG_DIR`, these commands do not follow it.
- **Go to Card**: pick a card from any workspace and bring it on screen. Its workspace is shown, the card focused and fitted, and infiniterm brought to the front. Needs the `ift focus` verb (infiniterm 0.6.4 or newer).
- **Run Saved Command in Card**: keep a list of commands you send often. Cmd+N adds one (a name, the command, and whether to press Enter), Cmd+E edits, Ctrl+X deletes. Enter on a saved command lets you choose the card to send it to. The list is stored in `saved-commands.json` in the extension's support directory, so it stays on your Mac.
- **Send Text to Card**: pick a card from every card on the canvas, type a command or text, and send it to that card's shell without moving the focus. "Press Enter after the text" is on by default.

If infiniterm is not running, opening a folder, file, diff or settings file starts it first and waits up to 30 seconds.

## ift path

Raycast starts commands with a minimal `PATH`, so the extension does not look `ift` up by name. It runs the file named in the **ift Path** preference, which defaults to the copy inside the app:

```
/Applications/infiniterm.app/Contents/MacOS/ift
```

To change it, for example if you installed the app elsewhere or want the `~/.local/bin/ift` link:

1. Find your `ift` in a terminal with `which ift`.
2. Open Raycast Settings, then Extensions, select Infiniterm, and open the **ift Path** preference.
3. Enter the absolute path. A `~` is not expanded.

## Troubleshooting

- **"Cannot run ift at ..."**: the file in the **ift Path** preference is missing or not executable. Fix the path as described above.
- **"Could not open in infiniterm" with `ift: ...` text**: the message is ift's own error.
- **"This ift has no `workspaces` verb yet"** or **"This ift has no `focus` verb yet"**: your infiniterm is older than 0.6.4. Update it.
- **Nothing happens or the wrong folder opens**: Finder must provide the selection. Bring Finder to the front, select the folder, then run the command.
