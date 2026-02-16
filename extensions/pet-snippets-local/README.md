# Pet Snippets (Local)

Raycast/Vicinae extension for searching local `pet` snippets.  
This extension is local-only and does not run `pet sync`.

Language:
- Default docs: English (this file)
- Chinese docs: `README.zh.md`

## Install

- Raycast users: install from Raycast Store after publish approval.
- Vicinae users: install from this repository path after release.

## Features

- Read snippet content from local `pet` snippet file.
- Search by text and `tag:<name>`.
- Copy/Paste snippet command.
- Configurable default action order (`Copy` or `Paste`).
- Recent usage ranking using local metadata.
- Auto-refresh when snippet file changes (2s polling) and manual reload action.

## Preferences

- `Snippet Source`
  - `Pet CLI (config-aware, recommended)`: calls `pet list` and follows your `pet` config
  - `Snippet File (legacy)`: reads a TOML snippet file directly
- `Pet Config File Path` (optional in `Pet CLI` mode)
  - default resolution: `$XDG_CONFIG_HOME/pet/config.toml`, fallback `~/.config/pet/config.toml`
- `Pet Binary Path` (optional in `Pet CLI` mode)
  - leave empty for auto-detect
  - set this if Raycast cannot find `pet` (for example `/opt/homebrew/bin/pet`)
- `Pet Snippet File Path` (optional in `Snippet File` mode)
  - default resolution: `$XDG_CONFIG_HOME/pet/snippet.toml`, fallback `~/.config/pet/snippet.toml`
  - used only in `Snippet File` mode
- `Default Action` (`Copy` or `Paste`)
- `Command Display`
  - `Detail Pane (Recommended)`: clean list + right-side detail with command
  - `Title Only (Clean)`: show only description in list
  - `Subtitle (Description + Command)`: show command inline in list
- `Last Used Display`
  - `Off (Clean)` (default)
  - `Relative` (for example `20m ago`)
  - `Absolute` (formatted date/time)

## Local Development

Recommended in monorepo mode:

```bash
cd <repo-root>
nix develop
npm run bootstrap
npm run dev:pet-snippets
```

## Build Check

```bash
cd <repo-root>
npm run build:pet-snippets
```

## Publish to Raycast Store

```bash
cd plugins/pet-snippets
npm run lint
npm run build
npm run publish
```

Notes:
- Your `author` field in `package.json` must match your Raycast handle.
- `npm run publish` creates a PR to `raycast/extensions` for review.

## Regenerate Icon

```bash
cd <repo-root>
python plugins/pet-snippets/scripts/generate_icon.py
```
