# Mise

Raycast commands for [mise](https://mise.jdx.dev) (mise-en-place), the polyglot dev-tool version manager by [jdx](https://github.com/jdx/mise): search, install and upgrade the tools it manages, and run its tasks, from Raycast.

## Requirements

mise must be installed. The extension looks for it at `~/.local/bin/mise`, `/opt/homebrew/bin/mise` and `/usr/local/bin/mise`, then asks your login shell. If none of those find it, set the **Mise Path** preference to the binary's absolute path.

Every mise command runs with your login shell's environment (`zsh -il` or `bash -il`, read once a day), so the `PATH` and exports such as `CARGO_HOME` from your `.zshrc` apply exactly as they do in a terminal.

Install mise with the one-liner from [mise.jdx.dev](https://mise.jdx.dev/getting-started.html):

```sh
curl https://mise.run | sh
```

## Commands

- **Search Tools** browses the mise registry and adds a tool to your global config (`mise use -g`).
- **Show Installed Tools** shows every installed tool and version, and can set the global version, upgrade, uninstall, or reveal the install directory.
- **Show Outdated Tools** lists the tools behind their latest version with Upgrade and Upgrade All, and shows the count as its own subtitle in Raycast's root search.
- **Manage Tasks** lists your global mise tasks and runs one in your terminal (`mise run <task>`), or runs it behind a toast and shows the captured output.
- **Tools Menu Bar** sits in the menu bar with the number of outdated tools, refreshed every twelve hours, and upgrades them with one click.
- **Upgrade All Tools** runs `mise upgrade` for every tool behind a progress toast, without opening a window.
- **Prune Unused Versions** runs `mise prune`, deleting installed versions that no config uses.
- **Clear Cache** runs `mise cache clear`. It is disabled by default; enable it in the extension's settings.

All commands work on your global mise configuration, which is what applies when no project config is active.

## Preferences

- **Mise Path** points at the binary when automatic detection fails.
- **Terminal Application** is where **Run in Terminal** (⌘T on a tool, an upgrade or a version) opens the same mise command instead of running it behind a toast. Ghostty, iTerm2 and Terminal are supported; anything else falls back to Terminal.
- **Upgrade past the configured range** adds `--bump` to `mise upgrade` and `mise outdated`, rewriting the version in your config.
- **Include inactive tools** adds `--inactive` to `mise outdated` and `mise upgrade`.
- **Remove the tool from config when uninstalling a configured version** runs `mise unuse` on the config file instead of `mise uninstall`.
- **Parallel Jobs** passes `-j <n>` to `mise use` and `mise upgrade`.
- **Show inactive tools in Show Installed Tools** toggles the Inactive section.
- **Close window after actions** closes Raycast when an install, upgrade or uninstall starts and shows the result as a HUD.
- **Log mise commands to the console** prints every mise command line, exit code and duration to the extension's console.
- **Search Tools › Show details panel by default**, **Prune Unused Versions › What to prune** (`--tools` or `--configs`) and **Upgrade All Tools › Uninstall replaced versions** (`--prune`) are set on their own command.
