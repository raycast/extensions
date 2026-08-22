# Groundcrew for Raycast

Browse, monitor, and operate [Groundcrew](https://www.npmjs.com/package/@clipboard-health/groundcrew) tasks without leaving Raycast. Groundcrew dispatches coding agents to work on your tasks in isolated git worktrees; this extension is a control panel for the tasks and workspaces its CLI manages.

> [!IMPORTANT]
> This extension drives the **Groundcrew CLI** installed on your Mac. It never stores or transmits credentials — the CLI owns all configuration, credentials, and task state. You must install and configure Groundcrew before using the extension.

## Commands

- **Browse Groundcrew Tasks** — search and filter tasks from every configured source, open task details, and jump to task URLs, pull requests, and worktrees. Start a task or act on its workspace.
- **Groundcrew Status** — see active, preserved, and missing workspaces, queue and slot health, and degraded probes. Run lifecycle actions per workspace (Start, Stop, Stop with Reason, Stop & Clean Up, Resume, Cleanup) and bulk "Clean Up All Idle Workspaces". Cleanup skips worktrees with uncommitted changes; an explicit **Force** variant removes them too (with a confirmation). For a live task, Enter opens its cmux workspace; for an idle or interrupted one, Enter resumes it.
- **Start Groundcrew Task** — start a task by ticket number (`tem-3925` or `linear:tem-3925`), even one that isn't in the browse list.
- **Open Groundcrew Workspace** — open an existing pull request or branch in a Groundcrew worktree.
- **Groundcrew Doctor** — diagnose host prerequisites, configuration, and Linear reachability by running `crew doctor`.

## Prerequisites

1. **macOS** with [Raycast](https://www.raycast.com/) installed.
2. **Groundcrew CLI `4.50.3` or newer**, installed and configured:
   ```sh
   npm install -g @clipboard-health/groundcrew
   ```
   Configure it (source, credentials, and defaults) per the Groundcrew docs. The extension reads whatever the CLI is already set up to use.

## Configuration

**Groundcrew Executable Path** (optional) — an absolute path to the `crew` executable, e.g. `/opt/homebrew/bin/crew`. Leave it blank to auto-discover `crew` from Raycast's `PATH`, then `/opt/homebrew/bin` and `/usr/local/bin`, then an nvm install (`$NVM_DIR/versions/node/*/bin`, newest first).

Auto-discovery does **not** cover fnm or asdf. On those setups — or any time `crew` needs environment your shell provides — set this preference to an absolute path (a [wrapper script](#the-universal-fix-a-wrapper-the-preference-points-at) is the most reliable choice; see Troubleshooting).

**Editor Application** (optional) — the app used for "Open in Editor" on a task worktree (e.g. Visual Studio Code, Cursor). Leave it blank to use the macOS "Open With" picker.

## Troubleshooting

Raycast launches command-line tools with a **minimal environment**: a bare `PATH`
(`/usr/bin:/bin:/usr/sbin:/sbin`) and **none** of your shell's exported variables. Your terminal
loads `~/.zshrc` / `~/.zprofile` (and files like `~/.secrets`); Raycast does not. So anything `crew`
relies on from your shell — the `node` that runs it, its provider API key, or the `git` / `gh` /
`cmux` / `tmux` it shells out to — can be missing when a command runs from Raycast.

Homebrew installs usually work out of the box, because `/opt/homebrew/bin` is already on Raycast's
`PATH`. Node-version-manager installs (nvm, fnm, asdf) and shell-exported credentials are the common
failure cases below. The **Groundcrew Doctor** command surfaces exactly which of these is wrong.

### `env: node: No such file or directory` (PATH)

**Cause:** `crew` is a Node script (`#!/usr/bin/env node`). Your `node` lives in a version-manager
directory (e.g. `~/.local/share/fnm/.../bin`) that isn't on Raycast's `PATH`, so the shebang can't
find it.

**Fix:** use the wrapper below, which calls `node` by absolute path and puts your tool directories
on `PATH`.

### "Linear API key not set" — Browse fails but Status works (API key)

**Cause:** `crew task list` (Browse, Start, and lifecycle actions) needs the provider key
`GROUNDCREW_LINEAR_API_KEY` (or `LINEAR_API_KEY`). That key is exported from your shell profile,
which Raycast doesn't load. `crew status` (Status) only reads local files, so it keeps working —
which is why Status succeeds while Browse fails.

**Fix:** make the key available to `crew` when Raycast spawns it. The wrapper below sources the same
file your shell does (`~/.secrets`); adjust the path if your key lives in `~/.zshrc` or elsewhere.

### Cleanup fails with `Session: Unknown` / can't reconcile (session backend)

**Cause:** `crew`'s workspace probe needs its session backend (`cmux` or `tmux`) and `git` / `gh` on
`PATH`. Raycast strips them, so cleanup can't determine or tear down session state.

**Fix:** the wrapper below adds `/opt/homebrew/bin` (where these live) to `PATH`.

### The universal fix: a wrapper the preference points at

Create a small wrapper that restores the environment `crew` needs, then point the **Groundcrew
Executable Path** preference at its absolute path (or place it at `/opt/homebrew/bin/crew` so
auto-discovery finds it):

```sh
#!/bin/sh
# ~/.local/bin/crew-raycast   (remember: chmod +x ~/.local/bin/crew-raycast)

# 1) Provider API keys — source the same file your shell does.
[ -f "$HOME/.secrets" ] && . "$HOME/.secrets"        # e.g. exports GROUNDCREW_LINEAR_API_KEY

# 2) Tools crew needs on PATH: node, git, gh, cmux/tmux.
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:$HOME/.local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

# 3) Run crew via an absolute node path so the shebang never has to find it.
exec "$(command -v node)" "$(npm root -g)/@clipboard-health/groundcrew/bin/run.js" "$@"
```

Verify it works from a bare environment (mimicking Raycast) before setting the preference:

```sh
chmod +x ~/.local/bin/crew-raycast
env -i HOME="$HOME" PATH="/usr/bin:/bin" ~/.local/bin/crew-raycast --version   # prints the version
```

Then set **Groundcrew Executable Path** to `~/.local/bin/crew-raycast` (use the full absolute path).

## Development

```sh
npm install
npm run dev     # ray develop
npm run build   # produce and validate a distribution build
npm test        # vitest
```

## Project Structure

- `src/cli` — Groundcrew CLI client and process boundary
- `src/types` — shared domain types
- `src/components` — reusable Raycast UI components
- `src/__tests__` — tests for shared and command behavior
