<p align="center">
  <img src="assets/icon.png" alt="Groundcrew for Raycast icon" width="128" height="128">
</p>

# Groundcrew for Raycast

Browse, monitor, and operate [Groundcrew](https://www.npmjs.com/package/@clipboard-health/groundcrew) tasks without leaving Raycast. Groundcrew dispatches coding agents to work in isolated git worktrees; this extension is a control panel for the tasks and workspaces its CLI manages.

> [!IMPORTANT]
> This extension drives the **Groundcrew CLI** on your Mac — install and configure it first. Nothing leaves your machine; the extension only stores an optional **Additional PATH** and **Linear API Key** locally to build the environment `crew` runs in.

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

All preferences are optional:

- **Groundcrew Executable Path** — absolute path to `crew`. Leave blank to auto-discover from `PATH`, `/opt/homebrew/bin`, `/usr/local/bin`, then nvm. Set it for fnm/asdf or a wrapper (`which crew`).
- **Additional PATH** — colon-separated directories prepended to `PATH` when `crew` runs, so it and the `node` / `git` / `gh` / `cmux` it calls resolve under Raycast's stripped environment (`~` and `$HOME` expand). Find them with `dirname $(which crew node git cmux gh) | sort -u | paste -sd: -`.
- **Linear API Key** — exported to `crew` as `GROUNDCREW_LINEAR_API_KEY`. Set it only if Browse fails with "Linear API key not set" while Status works.

## Troubleshooting

Raycast runs tools with a bare `PATH` (`/usr/bin:/bin:/usr/sbin:/sbin`) and none of your shell's exported variables, so `crew` may not find its `node`, key, or tools. **Groundcrew Doctor** pinpoints which. Most issues are fixed by the preferences above:

| Symptom | Fix |
| --- | --- |
| `crew` not found (fnm/asdf) | Set **Groundcrew Executable Path** to `which crew`. |
| `env: node: No such file or directory` | Add your `node` directory to **Additional PATH**. |
| "Linear API key not set" (Browse fails, Status works) | Set **Linear API Key**. |
| Cleanup fails with `Session: Unknown` | Add `/opt/homebrew/bin` (holds `cmux`/`git`/`gh`) to **Additional PATH**. |

<details>
<summary>Wrapper script (one-stop fallback)</summary>

If you'd rather rebuild the whole environment in one place, point **Groundcrew Executable Path** at a wrapper:

```sh
#!/bin/sh
# ~/.local/bin/crew-raycast   (chmod +x it)
[ -f "$HOME/.secrets" ] && . "$HOME/.secrets"        # provider API keys
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:$HOME/.local/bin:/usr/bin:/bin"
exec "$(command -v node)" "$(npm root -g)/@clipboard-health/groundcrew/bin/run.js" "$@"
```

Verify from a bare environment before setting the preference:

```sh
env -i HOME="$HOME" PATH="/usr/bin:/bin" ~/.local/bin/crew-raycast --version
```

</details>

## Manual Installation

```sh
git clone https://github.com/shubhsherl/groundcrew-raycast.git
cd groundcrew-raycast
npm ci
npm run build
```

Then set your preferences under [Configuration](#configuration). To update later, `git pull` and re-run `npm run build`. Remove it anytime from Raycast → Extensions.

## Development

```sh
npm install
npm run dev     # ray develop — hot-reloads a dev copy while running
npm run build   # ray build — compiles and installs the extension into Raycast
npm test        # vitest
```
