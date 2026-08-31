<p align="center">
  <img src="assets/icon.png" alt="Groundcrew for Raycast icon" width="128" height="128">
</p>

# Groundcrew for Raycast

Browse, monitor, and operate [Groundcrew](https://www.npmjs.com/package/@clipboard-health/groundcrew) tasks without leaving Raycast. Groundcrew dispatches coding agents to work in isolated git worktrees; this extension is a control panel for the tasks and workspaces its CLI manages.

> [!IMPORTANT]
> This extension drives the **Groundcrew CLI** on your Mac — install and configure it first. Nothing leaves your machine; the extension only runs your local `crew`.

## Commands

- **Browse Groundcrew Tasks** — search tasks from every source, open details, and jump to task URLs, PRs, and worktrees.
- **Groundcrew Status** — active, preserved, and missing workspaces with queue and slot health. Run lifecycle actions per task (Start, Stop, Resume, Clean Up, and bulk "Clean Up All Idle Workspaces"). Enter opens a live task's cmux workspace, or resumes an idle/interrupted one.
- **Start Groundcrew Task** — start a task by ticket number (`tem-3925`), even one not in the browse list.
- **Open Groundcrew Workspace** — open an existing pull request or branch in a worktree.
- **Groundcrew Doctor** — run `crew doctor` to diagnose prerequisites, config, and Linear reachability.

> Tip: Assign a hotkey to a command in Raycast (Extensions → Groundcrew → Groundcrew Status → Record Hotkey) to jump straight in without opening Raycast first.

## Prerequisites

- **macOS** with [Raycast](https://www.raycast.com/).
- **Groundcrew CLI**, installed and configured per the Groundcrew docs:
  ```sh
  npm install -g @clipboard-health/groundcrew
  ```

## Configuration

Two optional preferences:

- **Groundcrew Executable Path** — absolute path to `crew` (or to the shim below). Leave blank to auto-discover from `PATH`, `/opt/homebrew/bin`, `/usr/local/bin`, then nvm.
- **Editor Application** — the app used for "Open in Editor" on a worktree (e.g. Visual Studio Code). Leave blank for the macOS "Open With" picker.

### Giving `crew` its environment (the shim)

Raycast launches tools with a **stripped environment**: a bare `PATH` (`/usr/bin:/bin:/usr/sbin:/sbin`) and none of your shell's exports. So `crew`, the `node` that runs it, its Linear key, and the `git` / `gh` / `cmux` / `tmux` it shells out to can all be missing. Read commands (Browse, Status) often survive on a Homebrew/nvm `crew`, but `crew start` / `resume` need the session backend and fail with _"neither cmux nor tmux is on PATH."_

The reliable fix is a small **shim** that restores the environment, with **Groundcrew Executable Path** pointed at it. Create `~/.local/bin/crew-raycast`:

```sh
mkdir -p ~/.local/bin
cat > ~/.local/bin/crew-raycast <<'EOF'
#!/bin/sh
# Restore the environment crew needs under Raycast's stripped PATH.
[ -f "$HOME/.secrets" ] && . "$HOME/.secrets"   # provider keys, e.g. GROUNDCREW_LINEAR_API_KEY

# Directories holding node (your version manager) + git/gh/cmux/tmux (Homebrew).
# Swap the first entry for your node install: dirname "$(readlink -f "$(command -v node)")"
export PATH="$HOME/.local/share/fnm/node-versions/v24.14.1/installation/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"

# Absolute node + crew so the `#!/usr/bin/env node` shebang never has to be found.
exec "$(command -v node)" "$(command -v crew)" "$@"
EOF
chmod +x ~/.local/bin/crew-raycast
```

Verify it from a **bare** environment (mimicking Raycast) before wiring it up — `crew doctor` should report every check `ok`:

```sh
env -i HOME="$HOME" PATH="/usr/bin:/bin" ~/.local/bin/crew-raycast doctor
```

Then set **Groundcrew Executable Path** to the shim's absolute path (e.g. `/Users/you/.local/bin/crew-raycast`). Your terminal keeps using its own `crew`, so nothing else changes.

## Troubleshooting

**Groundcrew Doctor** pinpoints what's missing. Nearly every failure is the stripped environment above, and the [shim](#giving-crew-its-environment-the-shim) fixes all of them:

| Symptom | Cause (fixed by the shim) |
| --- | --- |
| `crew` not found | `crew` isn't on Raycast's PATH — point **Groundcrew Executable Path** at the shim. |
| `env: node: No such file or directory` | `node`'s directory isn't on PATH — the shim's `PATH=` line adds it. |
| `neither cmux nor tmux is on PATH` (Start/Resume) | session backend missing — the shim adds `/opt/homebrew/bin`. |
| "Linear API key not set" (Browse fails, Status works) | key not exported — the shim sources it from `~/.secrets`. |
| Cleanup fails with `Session: Unknown` | same PATH/backend gap — the shim covers it. |

## Manual Installation

```sh
git clone https://github.com/shubhsherl/groundcrew-raycast.git
cd groundcrew-raycast
npm ci
npm run build
```

Then set the **Groundcrew Executable Path** under [Configuration](#configuration). To update later, `git pull` and re-run `npm run build`. Remove it anytime from Raycast → Extensions.

## Development

```sh
npm install
npm run dev     # ray develop — hot-reloads a dev copy while running
npm run build   # ray build — compiles and installs the extension into Raycast
npm test        # vitest
```
