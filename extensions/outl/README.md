# outl for Raycast

A thin Raycast client for the [outl](https://github.com/avelino/outl) outliner.
Every command shells out to the `outl` CLI — no outliner logic is reimplemented here.

## Commands

| Command           | Mode    | What it does                                                                                                                   |
| ----------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Quick Capture** | no-view | Append a line to today's journal (`outl daily append`). Shows a HUD on success.                                                |
| **Search**        | view    | Search-as-you-type over blocks + pages (`outl search --in all`). Enter opens the hit in the app; `Cmd+.` copies its deep link. |
| **Open Today**    | no-view | Opens `outl://daily/today` in the desktop app.                                                                                 |
| **New Page**      | view    | Create a page (`outl page create`), then open it in the app.                                                                   |

## Preferences

| Preference         | Required | Default | Notes                                                                                   |
| ------------------ | -------- | ------- | --------------------------------------------------------------------------------------- |
| **Workspace Path** | yes      | —       | Absolute path to your outl workspace (the folder with `.outl/`, `journals/`, `pages/`). |
| **outl Binary**    | no       | `outl`  | Path to the `outl` binary. See the PATH caveat below.                                   |

### PATH caveat

Raycast does **not** inherit your interactive shell's `PATH`. If `outl` lives in
a non-standard location (Homebrew on Apple Silicon, `~/.cargo/bin`, a Nix profile),
the default `outl` will fail with "binary not found". Set the **outl Binary**
preference to an absolute path, e.g.:

- Homebrew (Apple Silicon): `/opt/homebrew/bin/outl`
- Cargo install: `/Users/<you>/.cargo/bin/outl`
- Local build: `/Users/<you>/projects/outl/target/release/outl`

## "Open in app" depends on the deep link scheme

The Search, New Page, and Open Today commands open results through the `outl://`
URL scheme:

- `outl://daily/today`
- `outl://daily/<YYYY-MM-DD>`
- `outl://page/<slug>` (slug may nest with `/`)

The **desktop app registers this handler** (tracked in issue #98). Until a build
that registers the scheme is installed, macOS will show its own "no application
set to open the URL" dialog. Quick Capture does not depend on the scheme — it
only writes through the CLI.

## How it talks to the CLI

The extension runs:

```
outl --workspace <workspace> <subcommand> ... --json
```

and parses the JSON envelope (`{ ok, data, error }`) the CLI emits. Arguments are
passed as an argv array via Node's `execFile` (never a shell string), so a search
query is always treated as plain text — no shell injection.

## Development

```sh
# from the repo root (bun workspace)
bun install

# from this directory
bun run dev       # ray develop — hot-reloads into Raycast
bun run lint
bunx tsc --noEmit # typecheck
```

> The icon (`assets/command-icon.png`, 512×512) is the outl mascot, downscaled
> from `assets/app-store-icon-1024.png` so it matches the desktop and mobile app
> icons. Swap it for a Raycast-tuned (centered/cropped) variant before publishing
> to the store if the corner-framed mascot reads too sparse at list size.

## License

MIT — same as the outl workspace.
