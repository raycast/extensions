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

  On mise 2026.10.25 or later it can also create, edit and delete tasks. **Create Task** (⌘N) adds one to your global config with `mise tasks add --global`, from a name, a description and a run command. **Edit Task** (⌘E) changes the description or run command with `mise tasks set`, and **Delete Task** (⌃X) removes the task with `mise tasks rm` after you confirm. Edit and Delete act on the TOML file that defines the task, including files in `conf.d`, and are not offered for file tasks, which are scripts. mise quotes each word of the run command, so a command that needs the shell, such as one with a pipe, `&&` or `$VAR`, has to be wrapped as `sh -c '…'`. A task with several run commands keeps them; edit those in the file.
- **Tools Menu Bar** sits in the menu bar with the number of outdated tools, refreshed every twelve hours, and upgrades them with one click.
- **Upgrade All Tools** runs `mise upgrade` for every tool behind a progress toast, without opening a window.
- **Prune Unused Versions** runs `mise prune`, deleting installed versions that no config uses.
- **Clear Cache** runs `mise cache clear`. It is disabled by default; enable it in the extension's settings.

When a newer mise is out, Show Outdated Tools and the Tools Menu Bar show **mise &lt;version&gt; available** at the top. It needs mise 2026.10.22 or later, which reports the latest release in `mise version --json`; older releases, or mise offline, show nothing. The update command depends on how mise was installed, because `mise self-update` refuses Homebrew installs:

- A Homebrew install (the binary or its symlink target is under `/opt/homebrew` or `/usr/local/Cellar`, or inside `Cellar/mise/`) runs `brew upgrade mise`.
- A `mise.run` install (`~/.local/bin/mise`, or `$MISE_INSTALL_PATH`) runs `mise self-update --yes`.
- Anything else opens the [install docs](https://mise.jdx.dev/installing-mise.html).

The command opens in your **Terminal Application**, so you see its output. Copy Command copies it instead; in the menu bar, hold ⌥ to show it.

All commands work on your global mise configuration, which is what applies when no project config is active.

Every mise command runs from your home directory, so a `~/mise.toml` or a `MISE_<TOOL>_VERSION` variable would otherwise count as config. Manage Tasks passes `-g` to `mise tasks ls`, and on mise 2026.10.7 or later Show Outdated Tools, the Tools Menu Bar, Upgrade All Tools, the upgrades in Show Installed Tools and their **Run in Terminal** commands pass `--global` to `mise outdated` and `mise upgrade`, so only the global and system config count. Older mise releases reject `--global` and run without it. mise also rejects `--global` alongside `--inactive`, so **Include inactive tools** turns it off.

## Raycast AI

The extension bundles an Agent Skill, **Global Tools and Tasks** (`skills/mise-global-tools/SKILL.md`). Mention it in AI Chat to ask how to add, pin, upgrade or prune tools and run global tasks. It explains the mise commands involved and points you to the command above that runs them. The extension has no AI tools, so Raycast AI can't run mise for you.

## Preferences

- **Mise Path** points at the binary when automatic detection fails.
- **Terminal Application** is where **Run in Terminal** (⌘T on a tool, an upgrade or a version) opens the same mise command instead of running it behind a toast. Ghostty, iTerm2 and Terminal are supported; anything else falls back to Terminal.
- **Upgrade past the configured range** adds `--bump` to `mise upgrade` and `mise outdated`, rewriting the version in your config.
- **Include inactive tools** adds `--inactive` to `mise outdated` and `mise upgrade`, in place of `--global`.
- **Remove the tool from config when uninstalling a configured version** runs `mise unuse` on the config file instead of `mise uninstall`.
- **Parallel Jobs** passes `-j <n>` to `mise use` and `mise upgrade`.
- **Show inactive tools in Show Installed Tools** toggles the Inactive section.
- **Close window after actions** closes Raycast when an install, upgrade or uninstall starts and shows the result as a HUD.
- **Log mise commands to the console** prints every mise command line, exit code and duration to the extension's console.
- **Search Tools › Show details panel by default**, **Prune Unused Versions › What to prune** (`--tools` or `--configs`) and **Upgrade All Tools › Uninstall replaced versions** (`--prune`) are set on their own command.
