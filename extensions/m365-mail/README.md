# M365 Mail — Raycast Extension

Read and compose Microsoft 365 emails directly from Raycast, powered by [CLI for Microsoft 365](https://pnp.github.io/cli-microsoft365/).

## Commands

| Command | Description |
|---|---|
| **Inbox** | Browse your Microsoft 365 inbox with split-pane detail view |
| **Compose** | Compose and send a new email |

## Keyboard Shortcuts (Inbox)

| Shortcut | Action |
|---|---|
| `⌘R` | Reply to selected email |
| `⌘N` | Compose new email |
| `⌘⇧R` | Refresh inbox |
| `⌃X` | Delete selected email |

## Extension Preferences

| Setting | Default | Description |
|---|---|---|
| m365 CLI Path | *(auto-detect)* | Full path to the `m365` binary if auto-detection fails |

Auto-detection checks: `/usr/local/bin/m365`, `/opt/homebrew/bin/m365`, `~/.npm-global/bin/m365`
