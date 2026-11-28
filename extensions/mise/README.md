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

  Tasks with `tags` (mise 2026.11.2 or later) show them, can be found by them, and can be filtered with the tag dropdown. **Run Tagged Tasks in Terminal** runs every task with one of the task's tags (`mise run --tag <tag>`). On mise 2026.11.3 or later each task shows how its last run ended and its median duration over successful runs, from `mise tasks history --summary`. mise keeps that history per directory, so it counts runs started from Raycast or from a shell in your home directory.
- **Tools Menu Bar** sits in the menu bar with the number of outdated tools, refreshed every twelve hours, and upgrades them with one click.
- **Upgrade All Tools** runs `mise upgrade` for every tool behind a progress toast, without opening a window.
- **Prune Unused Versions** runs `mise prune`, deleting installed versions that no config uses.
- **Clear Cache** runs `mise cache clear`. It is disabled by default; enable it in the extension's settings.

On mise 2026.11.12 or later, Show Outdated Tools and the Tools Menu Bar also list tools with known vulnerabilities in a **Vulnerable** section above the outdated tools, from `mise audit`. The warning icon is red for high or critical severity, orange for medium and yellow for low or unrated. Each entry shows its advisory count, its highest severity and, when every advisory names a fixed release, the first version that fixes them all. **Show Advisories** lists them with links, and **Upgrade Vulnerable Tools** runs `mise upgrade --vulnerable`. When a tool has no newer version in its configured range, the toast names it and offers **Upgrade Past Range** (`--bump`). The menu bar count stays the outdated count.

When a newer mise is out, Show Outdated Tools and the Tools Menu Bar show **mise &lt;version&gt; available** at the top. It needs mise 2026.10.22 or later, which reports the latest release in `mise version --json`; older releases, or mise offline, show nothing. The update command depends on how mise was installed, because `mise self-update` refuses Homebrew installs:

- A Homebrew install (the binary or its symlink target is under `/opt/homebrew` or `/usr/local/Cellar`, or inside `Cellar/mise/`) runs `brew upgrade mise`.
- A `mise.run` install (`~/.local/bin/mise`, or `$MISE_INSTALL_PATH`) runs `mise self-update --yes`.
- Anything else opens the [install docs](https://mise.jdx.dev/installing-mise.html).

The command opens in your **Terminal Application**, so you see its output. Copy Command copies it instead; in the menu bar, hold ⌥ to show it.

All commands work on your global mise configuration, which is what applies when no project config is active.

Every mise command runs from your home directory, so a `~/mise.toml` or a `MISE_<TOOL>_VERSION` variable would otherwise count as config. Manage Tasks passes `-g` to `mise tasks ls`, and on mise 2026.10.7 or later Show Outdated Tools, the Tools Menu Bar, Upgrade All Tools, the upgrades in Show Installed Tools and their **Run in Terminal** commands pass `--global` to `mise outdated` and `mise upgrade`, so only the global and system config count. Older mise releases reject `--global` and run without it. mise also rejects `--global` alongside `--inactive`, so **Include inactive tools** turns it off.

## Raycast AI

The extension bundles an Agent Skill, **Global Tools and Tasks** (`skills/mise-global-tools/SKILL.md`). Mention it in AI Chat to ask how to add, pin, upgrade or prune tools and run global tasks. It explains the mise commands involved and points you to the command above that runs them.

Raycast AI can also run mise for you. Mention **@mise** in AI Chat to use these tools:

| Tool | Runs | Asks first |
| --- | --- | --- |
| List Tools | `mise ls` | No |
| List Outdated Tools | `mise outdated`, as Show Outdated Tools does | No |
| List Tasks | `mise tasks ls -g` | No |
| Run Task | `mise run <task>`, for a global task only | Yes, showing every command the run executes, its dependencies' included, from `mise run --dry-run` |
| Use Tool Globally | `mise use -g <tool>@<version>` | Yes, showing the command |
| Upgrade Tools | `mise upgrade` for one tool or every outdated one, with `--global` and the **Upgrade past the configured range** preference; replaced versions stay installed | Yes, showing the command |

The tools run mise the way the commands do: the same binary, your login shell's environment, the home directory and only the global config. Like Manage Tasks, Run Task starts mise in the home directory, so a dependency that `~/mise.toml` redefines runs that version; the approval shows the commands mise will actually run. A task runs without a terminal, so it can't ask for input, and it stops after 10 minutes. List Tasks shares each task's commands with Raycast AI; the tools don't read your mise environment variables.

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
