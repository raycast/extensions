# foxhop

Focus a specific Firefox tab from anywhere on macOS — manage your saved tab targets and generate per-tab Raycast hotkey scripts.

## Requirements

- **foxhop CLI** must be installed. Install via npm:

  ```bash
  npm install -g foxhop
  ```

  Or configure the full path to the binary in extension preferences if it is not on your PATH.

- **Firefox extension** must also be installed for the CLI to communicate with Firefox. See the [foxhop project](https://github.com/kud/foxhop) for setup instructions.

## Commands

### Focus Tab

Search your saved tab targets by name, title, or match pattern and focus the corresponding Firefox tab. Firefox is brought to the foreground automatically.

Additional actions available per target:

- **Edit Target** — modify name, match pattern, strategy, or pick mode
- **Add Target** — create a new target from scratch
- **Add from Open Tab** — pick a currently open Firefox tab and prefill the form
- **Delete Target** — remove a target from your config
- **Generate Hotkey Scripts** — run `foxhop sync` to write Raycast script commands
- **Open Config File** — open `~/.config/foxhop/tabs.json` in your default editor
- **Refresh** (`⌘R`) — reload the target list

### Generate Hotkey Scripts

Runs `foxhop sync` in the background and shows a HUD notification with the result. This writes one Raycast script command per saved target into `~/.config/foxhop/scripts`, which you can then assign keyboard shortcuts to inside Raycast.

## Preferences

| Preference       | Description                               | Default           |
| ---------------- | ----------------------------------------- | ----------------- |
| foxhop CLI path  | Path to the `foxhop` binary               | `foxhop`          |
| Firefox app name | macOS app name used to foreground Firefox | `Firefox Nightly` |

Set these via **Raycast → Extensions → foxhop → Settings** before first use.
