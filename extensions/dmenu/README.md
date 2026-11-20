# dmenu for Raycast

A `dmenu`-style picker for macOS, built on Raycast. Pipe a list of options into the `dmenu` command-line script, pick one in Raycast, and get your selection printed back to stdout — just like the classic X11 `dmenu`.

## How it works

The project has two halves that talk to each other over a local socket:

- **`dmenu.py`** (bundled with the extension as `assets/dmenu.py`) — a CLI script you pipe items into. It starts a local socket server, opens the Raycast extension via a deeplink, sends over the list of items, waits for you to pick one, and prints your selection to stdout.
- **`dmenu.tsx`** — the Raycast extension command. It connects to the socket, receives the list, shows it as a searchable Raycast list, and sends your selection back when you choose one.

`dmenu.py` is only meant to be launched through the `dmenu` script — running the Raycast command directly (from root search, a hotkey, etc.) shows a friendly "not meant to be launched directly" screen instead of crashing, with an action to install the CLI script (see below).

## First time using this

1. Install the **Dmenu** extension from the Raycast Store.
2. Open the **Dmenu** command directly once (e.g. from Raycast's root search). Since it's launched with no arguments, it shows the "not meant to be launched directly" screen — run the **Install Dmenu CLI** action there. This copies the script bundled with the extension to `~/.local/bin/dmenu` and marks it executable.
3. Make sure `~/.local/bin` is on your `PATH`. The same screen has a **Copy Path Export Line** action; paste it into your `~/.zshrc` (or equivalent) and reload your shell:
   ```bash
   echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```

Once that's done, `dmenu` is callable from any terminal, anywhere:

## Usage

```bash
echo -e "Option A\nOption B\nOption C" | dmenu -p "Pick one"
```

### Example

```bash
git branch | sed 's/^[* ] //' | dmenu -p "Checkout branch" | xargs git checkout
```

## Developing from source

If you're working on the extension itself rather than just using it:

```bash
git clone https://github.com/AnasFd/dmenu-raycast dmenu-raycast
cd dmenu-raycast
npm install
npm run dev   # runs the command via `ray develop`, importing it into Raycast
```

While developing, you can pipe into `assets/dmenu.py` directly instead of the installed `dmenu` shim:

```bash
echo -e "Option A\nOption B" | ./assets/dmenu.py -p "Pick one"
```

## Requirements

- macOS with [Raycast](https://raycast.com) installed
- Python 3
- The `dmenu` Raycast extension command installed/available locally

## Credits

Based on [irth/dmenu_raycast](https://github.com/irth/dmenu_raycast). Fixed here after the original went stale.
