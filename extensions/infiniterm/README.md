# infiniterm for Raycast

Open Finder folders in [infiniterm](https://github.com/ekinertac/infiniterm) as terminal cards, in a workspace you pick or a new one. The extension drives the app through its `ift` command line tool.

## Commands

- **Open in Infiniterm**: takes the folders selected in Finder (a selected file counts as its parent folder). With nothing selected it uses the front Finder window's folder, then the Desktop. It lists your workspaces plus "New Workspace" (with an optional name) and opens a terminal card per folder in the one you choose.
- **Open in Infiniterm (Current Workspace)**: the same folders, no picker, on the workspace on screen.
- **New Terminal Card**: asks for a directory (home by default), then for a workspace. Cmd+Enter continues to the workspace picker, and Cmd+Shift+O skips it and uses the workspace on screen. Enter alone does not submit a form.
- **Open File in Infiniterm**: the file selected in Finder as an editor card of its own.
- **Open Git Diff in Infiniterm**: the git changes of the Finder selection, or of the front Finder window's folder, as a diff card.
- **Open Infiniterm Settings File** and **Open Infiniterm Keybindings File**: `~/.config/infiniterm/settings.json` and `keybindings.json` as editor cards. If you start the app with `INFINITERM_CONFIG_DIR`, these commands do not follow it.
- **Go to Card**: pick a card from any workspace and bring it on screen: its workspace is shown, the card focused and fitted, and infiniterm brought to the front. Needs an infiniterm release with `ift focus` ([ekinertac/infiniterm#553](https://github.com/ekinertac/infiniterm/pull/553)); on an older `ift` the command says so and sends nothing.
- **Run Saved Command in Card**: keep a list of commands you send often. Cmd+N adds one (a name, the command, and whether to press Enter), Cmd+E edits, Ctrl+X deletes. Enter on a saved command lets you choose the card to send it to. The list is stored in `saved-commands.json` in the extension's support directory, so it stays on your Mac.
- **Send Text to Card**: pick a card from every card on the canvas, type a command or text, and send it to that card's shell without moving the focus. "Press Enter after the text" is on by default.

The workspace picker remembers the last workspace you opened in and lists it first.

Opening a file, a diff or the settings files starts infiniterm first if it is closed, and waits up to 30 seconds for it.

If infiniterm is not running, `ift` starts it and waits up to 30 seconds.

## Requirements

- macOS with Raycast.
- infiniterm installed, with its `ift` tool on disk. The app bundle ships it at `/Applications/infiniterm.app/Contents/MacOS/ift`. `ift install` links it into `~/.local/bin`, and a Homebrew install links it into `/opt/homebrew/bin`; the default path below assumes the latter.
- Node.js 22 or newer and npm, to build the extension.

## Setup

```sh
git clone git@github.com:tarikkavaz/raycast-infiniterm.git
cd raycast-infiniterm
npm install
npm run dev
```

`npm run dev` imports the extension into Raycast and reloads it when files change. Stop it with Ctrl+C: the extension stays installed. To rebuild without the watcher, run `npm run build`.

## ift path

Raycast starts commands with a minimal `PATH`, so the extension does not look `ift` up by name. It runs the file named in the **ift Path** preference, which defaults to `/opt/homebrew/bin/ift`.

To check or change it:

1. Find your `ift`: `which ift`. The installed one is a symlink to `/Applications/infiniterm.app/Contents/MacOS/ift`.
2. Open Raycast, search "Extensions", select infiniterm, and open the **ift Path** preference (or press Cmd+, on either command).
3. Enter the absolute path. A `~` is not expanded.

Use the app bundle path directly if there is no symlink:

```
/Applications/infiniterm.app/Contents/MacOS/ift
```

## Workspace picking needs a newer ift

The workspace list relies on `ift workspaces` and `ift terminal --workspace`, added in [ekinertac/infiniterm#551](https://github.com/ekinertac/infiniterm/pull/551). Until that ships in your installed app:

- The extension reads `ift --help` to see whether the verb exists. An older `ift` would treat `ift workspaces` as a file to open, so the extension never sends it.
- The list then shows only "Current Workspace", which works with any `ift` that has `ift terminal`.

To try the workspace picker before the release, build the PR branch and run it as a scratch instance. `ift` finds the app's socket through the `INFINITERM_DATA_DIR` environment variable, and Raycast starts commands without your shell environment. Pointing **ift Path** straight at a debug build would therefore talk to your real app. A small wrapper script sets the variable for it.

1. In the infiniterm checkout, build the branch: `cargo build -p infiniterm-cli`. This gives `target/debug/ift`. Build the app too, so the app and `ift` match.
2. Make a scratch data directory and launch the built app on it, never on your real one:

   ```sh
   export SCRATCH=$HOME/infiniterm-scratch   # any empty directory
   mkdir -p "$SCRATCH"
   INFINITERM_DATA_DIR="$SCRATCH" <path to the built infiniterm> &
   ```

3. Create a wrapper script outside any repo, for example `$HOME/bin/ift-scratch`, and make it executable with `chmod +x`:

   ```sh
   #!/bin/sh
   export INFINITERM_DATA_DIR="$HOME/infiniterm-scratch"
   exec /path/to/infiniterm/target/debug/ift "$@"
   ```

   Use the same scratch directory as in step 2 and the real path of your checkout.
4. Create a second workspace in the scratch app so the list has something to pick: `ift-scratch run workspace.new`.
5. Set **ift Path** to the wrapper's absolute path, for example `/Users/you/bin/ift-scratch`.
6. When done, set **ift Path** back to the default.

The socket lock makes a second copy on the real data directory exit, and a test copy there could touch your canvas, so always use a scratch directory. To stop a scratch instance, find its pid from its socket and `kill` that pid. Do not use `pkill -f`, because the real app has the same binary name.

## Troubleshooting

- **"Could not open in infiniterm" with `ift: ...` text**: the message is ift's own stderr. Check the path preference first.
- **"This ift has no `workspaces` verb yet"** in the list: expected on an older ift, see above.
- **Nothing happens or the wrong folder opens**: Finder must provide the selection. Bring Finder to the front, select the folder, then invoke the command.

## Development

```sh
npm test        # unit tests for the output parsing and argument building
npm run lint    # Raycast lint (ESLint and Prettier)
npm run build   # production build
```

The logic that parses `ift workspaces` output and builds the `ift terminal` arguments lives in `src/lib/parse.ts` with tests beside it. The Finder lookup is `src/lib/finder.ts` and the `ift` calls are `src/lib/ift.ts`.
