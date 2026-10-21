# FanBar for Raycast

Control [FanBar](https://github.com/helson-lin/FanBar) from Raycast: switch
cooling presets (custom ones included), set a fixed fan speed, hand the fans
back to macOS, and keep the CPU temperature in the menu bar.

| Command | What it does |
|---|---|
| Switch Preset | Lists built-in and custom presets and marks the selected one. ↵ runs the preset's curve until the **Restore automatic control** timer in FanBar Settings; ⌘↵ keeps it until changed (`--hold`). |
| Fan Status | Mode, each fan's speed and range, CPU/GPU/SSD temperatures, and when macOS control comes back. |
| Fixed RPM | Holds every fan at one speed, checked against the range all fans accept. Tick **Hold until changed** to skip the restore timer. |
| Automatic | Hands the fans back to macOS and shows the result as a HUD. |
| FanBar Menu Bar | CPU temperature in the menu bar, refreshed every minute, with fans, temperatures, preset switching (⌥ to hold) and Automatic in its menu. |

## Requirements

The extension drives the `fanbar` command-line tool that ships inside
FanBar.app. Install it on PATH from **FanBar Settings › General › FanBar ›
Command-line tool › Install…**, or by hand:

```sh
sudo mkdir -p /usr/local/bin
sudo ln -sf /Applications/FanBar.app/Contents/Helpers/fanbar /usr/local/bin/fanbar
```

Raycast does not load your shell profile, so the extension looks for the tool
itself, in this order:

1. the **fanbar Path** preference, if set;
2. `/usr/local/bin/fanbar` (the Settings link);
3. `/opt/homebrew/bin/fanbar` (Homebrew on Apple Silicon);
4. `/Applications/FanBar.app/Contents/Helpers/fanbar`.

When none exists, every command says so and offers the install command.

## Behaviour

- Every call runs `fanbar … --json` with `execFile` (no shell) and reads the
  app's JSON reply (`FanBarCLIResponse` in
  `Sources/FanBarShared/FanBarCLIContract.swift`).
- Exit codes become toasts: `1` "FanBar refused the command" with the app's
  message, `2` "fanbar did not understand the command", `3` "FanBar could not
  be reached".
- Presets are switched by their id (`builtin:2`, `custom:<uuid>`), so a custom
  preset that shares a name with a built-in still switches the right one.
- Like the CLI, the commands you run start FanBar when it is not running. The
  menu bar's background refresh passes `--no-launch`, so it never reopens a
  FanBar you quit; it shows "FanBar is not running" instead. Clicking a preset
  in its menu is an explicit request and may start FanBar.

## Development

```sh
npm install
npm run dev     # load into Raycast in development mode
npm run build
npm run lint
```

`npm run publish` opens a pull request against `raycast/extensions` for Store
review. FanBar 0.7.0 and later ship the `fanbar` CLI the extension needs.
Before publishing, check that `author` in `package.json` is the Raycast Store
username and that `metadata/` holds the Store screenshots.

## Follow-ups for the CLI contract

Things the extension works around rather than changing the contract:

- `preset list --json` carries no `status`, so the selected preset cannot be
  told apart from the running one without a second `status` call. The menu bar
  makes both calls each refresh; Switch Preset only marks the selected preset.
- Exit code `3` has no JSON reply, so "not running" and "socket broken" can only
  be told apart by the stderr wording. A `--json` error object on stdout (for
  example `{"ok": false, "reachable": false, "message": …}`) would let
  integrations show precise states.
- `status` has no per-fan name (Left/Right), so fans show as Fan 1, Fan 2.
