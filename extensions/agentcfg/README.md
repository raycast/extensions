# agentcfg for Raycast

Manage [agentcfg](https://github.com/jorgenosberg/agentcfg) from Raycast: browse every skill, hook, and instruction file in your source tree, see per-target install state, and toggle, install, or sync without opening a terminal.

## Requirements

The extension shells out to the agentcfg CLI, which must be installed separately:

```sh
brew install jorgenosberg/tap/agentcfg
```

The binary is auto-detected from common install locations (`/opt/homebrew/bin`, `/usr/local/bin`, `~/go/bin`). If yours lives elsewhere, set the path in the extension preferences.

Run `agentcfg init` once in a terminal before first use to bootstrap your config and source tree.

## Commands

- **Manage Items** — one view over your whole setup. Filter by target with the dropdown, see each item's install state per target (linked, copied, drifted, absent, disabled), open the detail pane for the full breakdown, and toggle, install, uninstall, or sync directly. In All Targets mode, "Toggle on Target" flips an item for a single target.
- **Sync Configs** — runs `agentcfg sync` across all targets and reports the result as a toast.
