# dmenu for Raycast

A `dmenu`-style picker for macOS, built on Raycast. Pipe a list of options into the `dmenu` command-line script, pick one in Raycast, and get your selection printed back to stdout — just like the classic X11 `dmenu`.

## How it works

The project has two halves that talk to each other over a local socket:

- **`dmenu.py`** — a CLI script you pipe items into. It starts a local socket server, opens the Raycast extension via a deeplink, sends over the list of items, waits for you to pick one, and prints your selection to stdout.
- **`dmenu.tsx`** — the Raycast extension command. It connects to the socket, receives the list, shows it as a searchable Raycast list, and sends your selection back when you choose one.

`dmenu.py` is only meant to be launched through the `dmenu` script — running the Raycast command directly (from root search, a hotkey, etc.) shows a friendly "not meant to be launched directly" message instead of crashing.

## First time using this

```bash
# 1. Clone the repo
git clone https://github.com/AnasFd/dmenu-raycast dmenu-raycast
cd dmenu-raycast

# 2. Make the CLI script executable
chmod +x dmenu.py

# 3. Symlink it into a directory on your PATH, as `dmenu`
mkdir -p ~/.local/bin
ln -s "$(pwd)/dmenu.py" ~/.local/bin/dmenu

# 4. Make sure ~/.local/bin is on your PATH
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# 5. Install the Raycast extension command (dmenu.tsx) from this repo in Raycast
```

Once that's done, `dmenu` is callable from any terminal, anywhere:

## Usage

```bash
echo -e "Option A\nOption B\nOption C" | dmenu -p "Pick one"
```

### Example

```bash
git branch | sed 's/^[* ] //' | ./dmenu -p "Checkout branch" | xargs git checkout
```

## Requirements

- macOS with [Raycast](https://raycast.com) installed
- Python 3
- The `dmenu` Raycast extension command installed/available locally

## Credits

Based on [irth/dmenu_raycast](https://github.com/irth/dmenu_raycast). Fixed here after the original went stale.
