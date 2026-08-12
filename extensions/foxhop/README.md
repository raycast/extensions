# foxhop

Focus a specific Firefox tab from anywhere on macOS — manage your saved tab targets and generate per-tab Raycast hotkey scripts.

## Requirements

- **foxhop CLI** must be installed. Install via npm:

  ```bash
  npm install -g @kud/foxhop-cli
  ```

  Or configure the full path to the binary in extension preferences if it is not on your PATH.

- **Firefox extension** must also be installed for the CLI to communicate with Firefox. See the [foxhop project](https://github.com/kud/foxhop) for setup instructions.

## Commands

### List Tabs

Lists your saved tab targets (favourites first). Press `↵` to **Focus Tab** — activate the matching Firefox tab and bring Firefox to the foreground (it opens the tab if it isn't already open).

Per-target actions:

- **Focus Tab** (`↵`) — focus the matching tab
- **Favourite / Unfavourite** (`⌘F`) — pin a target to the top of the list
- **Edit Target** (`⌘E`) — edit it (URL-first; name, match, and title derive from the URL)
- **Add Target** (`⌘N`) — add a new target (just paste a URL)
- **Add from Open Tab** — pick a currently open Firefox tab and prefill the form
- **Delete Target** (`⌃X`) — remove a target
- **Generate Hotkey Scripts** — run `foxhop sync` to write Raycast script commands
- **Open Config File** — open `~/.config/foxhop/tabs.json`
- **Refresh** (`⌘R`) — reload the list

### Generate Hotkey Scripts

Runs `foxhop sync` in the background and shows a HUD notification with the result. This writes one Raycast script command per saved target into `~/.config/foxhop/scripts`, which you can then assign keyboard shortcuts to inside Raycast.

## Preferences

| Preference       | Description                               | Default           |
| ---------------- | ----------------------------------------- | ----------------- |
| foxhop CLI path  | Path to the `foxhop` binary               | `foxhop`          |
| Firefox app name | macOS app name used to foreground Firefox | `Firefox Nightly` |

Set these via **Raycast → Extensions → foxhop → Settings** before first use.
