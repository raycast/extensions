---
name: mise-global-tools
description: Use when a user asks how to add, pin, upgrade, uninstall or clean up dev tools managed by mise, or how to run their global mise tasks, from Raycast. Explains what each mise command does to the global config and which Mise extension command to open.
---

# Global tools and tasks with mise

## Scope

The Mise extension works on the global mise config, `~/.config/mise/config.toml`.
It runs every mise command from the home directory with the user's login-shell
environment, so it sees the global config rather than any project's `mise.toml`.
The extension has no AI tools: you cannot run mise or read the user's config.
Explain what to do, give the exact mise command, and name the Raycast command
that does it.

## Adding tools and choosing versions

- `mise use -g <tool>@<version>` installs the tool and records the request in the
  global config. Without a version, mise requests `latest`.
- A version can be a range. `node@20` writes `node = "20"` and uses the newest
  20.x release. `--pin` writes the resolved version, such as `20.19.5`, instead.
- Tools can come from backends: `npm:prettier`, `cargo:ripgrep`, `pipx:black`,
  `github:owner/repo`, and others.

In Raycast:

- **Search Tools** searches the mise registry and adds a tool with **Use Globally**
  (`mise use -g <tool>@latest`). Typing a backend prefix such as `npm:`, `cargo:`
  or `gem:` searches that package registry. The **Install to** dropdown can write
  to another config file that `mise config ls` lists (`--path`) instead.
  **Remove** runs `mise unuse <tool>` and then `mise uninstall --all <tool>`.
- **Show Installed Tools** lists installed versions. **Set Global Version…** picks a
  version and runs `mise use -g <tool>@<version>`. **Uninstall Version…** runs
  `mise uninstall <tool>@<version>`, or `mise unuse` on the config file that
  requests it when the **Remove the tool from config when uninstalling**
  preference is on.

## Upgrading

- `mise outdated` lists tools whose installed version is older than the newest
  version their configured range allows. `mise upgrade` installs those versions
  and keeps the range: with `node = "20"` it moves to the newest 20.x.
- `--bump` upgrades past the range to the newest release and rewrites the config,
  keeping its precision: `node = "20"` becomes `node = "22"`.
- The replaced version is removed after the `upgrade.prune_after` grace period,
  unless a tracked config or tool stub still uses it. `--prune` removes it at once.

In Raycast, **Show Outdated Tools** lists outdated tools with **Upgrade** and
**Upgrade All**. **Upgrade All Tools** runs `mise upgrade` without a window. The
**Upgrade past the configured range** preference adds `--bump`, and Upgrade All
Tools' **Uninstall replaced versions** setting adds `--prune`.

## Cleaning up

- **Prune Unused Versions** runs `mise prune`. It deletes installed versions that
  no tracked config file or tool stub selects, and forgets config files that no
  longer exist. Its setting limits it to `--tools` or `--configs`. Suggest
  `mise ls --prunable` to preview what it deletes.
- **Clear Cache** runs `mise cache clear`. It deletes cached data such as version
  lists, not installed tools. It is disabled by default; the user enables it in
  the extension's settings.

## Tasks

Global tasks come from `[tasks]` in `~/.config/mise/config.toml` and from files in
`~/.config/mise/tasks/`. For example:

```toml
[tasks.hello]
description = "Say hello"
run = "echo hello"
```

**Manage Tasks** lists them. **Run in Terminal** opens `mise run <task>` in the
user's terminal; **Run and Show Output** runs it in the background and shows the
output.

## Do not

- Do not suggest editing a project's `mise.toml` to change what this extension
  shows; it runs from the home directory, outside any project.
- Do not claim a tool was installed, upgraded or removed. Only the user can run
  these commands.
