# Yabai Focus

Search open `yabai` windows from Raycast and focus the selected app or window.

Yabai Focus is built for macOS users who already use `yabai` for window management and want a fast app/window switcher without replacing their existing `skhd` shortcuts.

## Features

- Lists focusable windows from `yabai -m query --windows`.
- Shows app icons when Raycast can resolve the macOS application bundle.
- Keeps multiple windows from the same app as separate results.
- Excludes Raycast's own command palette from results.
- Deprioritizes the currently focused window so switching targets are easier to reach.
- Focuses the selected window with `yabai -m window --focus <window-id>`.
- Falls back to `open -a <app-name>` if `yabai` cannot focus the window.
- Refreshes shortly after opening so newly launched apps can appear without reopening Raycast.

## Requirements

- macOS.
- `yabai` installed and running.
- macOS Accessibility permission granted to `yabai`.
- macOS Accessibility permission granted to Raycast if window focus is blocked.

The extension searches for command-line tools on this path:

```text
/Users/${USER}/.nix-profile/bin:/nix/var/nix/profiles/default/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin
```

## Usage

1. Open Raycast.
2. Run `Focus App`.
3. Search by app name or window title.
4. Press `Return` to focus the selected window.

The action panel also includes:

- `Focus Window`
- `Copy Yabai Focus Command` with `Cmd-.`
- `Refresh` with `Cmd-R`

## Local Development

```sh
npm install
npm run dev
```

Raycast imports the local extension when development mode starts. The command remains available from Raycast root search while the development server is running.

## Release Checks

```sh
npm run ci
npm run publish
```

`npm run ci` runs formatting, TypeScript diagnostics, lint, and the Raycast distribution build. `npm run publish` starts Raycast's public Store submission flow.

## Troubleshooting

- Empty list: confirm the target window is not hidden, minimized, or missing an Accessibility reference in `yabai`.
- `yabai` not found: confirm `yabai` is installed in one of the PATH directories listed above.
- Focus fails: confirm both `yabai` and Raycast have Accessibility permission in macOS Settings.
