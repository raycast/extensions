# IONOS Sync

Sync local projects to your IONOS web hosting server via rsync over SSH — directly from Raycast. No terminal required.

## Features

### Sync Project

Select a project, preview what would change (dry-run), then push or pull with one keystroke. rsync output streams line by line into a Detail view so you always know what's happening.

### Manage Projects

Add, edit, or remove sync projects through a native Raycast form. Each project stores its own exclude rules and controls whether `--delete` is active.

### Sync History

Every sync (including dry-runs) records a timestamp, direction, and result. The project list shows the last sync at a glance.

## Setup

### 1. SSH Access

Your IONOS hosting plan must have SSH enabled. Activate it in the IONOS Control Panel under **Hosting → SSH Access**.

### 2. Preferences

Open Extension Preferences (`⌘,`) and fill in:

| Field        | Example                | Required |
| ------------ | ---------------------- | -------- |
| IONOS Host   | `ssh.hosting.ionos.de` | ✅       |
| SSH Username | `uXXXXXXXX`            | ✅       |
| SSH Port     | `22`                   | —        |
| SSH Key Path | `~/.ssh/id_rsa`        | —        |

### 3. SSH Key (recommended)

Set up key-based authentication so rsync doesn't prompt for a password:

```bash
ssh-keygen -t ed25519 -C "ionos"
ssh-copy-id -p 22 uXXXXXXXX@ssh.hosting.ionos.de
```

### 4. rsync

macOS ships with rsync. For the latest version:

```bash
brew install rsync
```

## Workflow

1. Open Raycast → **Sync Project**
2. Select your project
3. Choose **Dry-run** first to preview changes
4. Choose **Push** or **Pull** to transfer

## Project Configuration

Projects are stored in Raycast's LocalStorage and fully configurable via **Manage Projects**.

Each project has:

- **Local path** — the folder on your Mac to sync
- **Remote path** — the destination on your IONOS server
- **Excludes** — files and folders to skip (one per line, wildcards supported)
- **--delete** — remove files on the remote that no longer exist locally

⚠️ **Root-level remotes** (`~/` or `~`): `--delete` is always disabled for safety. Files deleted locally will not be removed on the server.

## Troubleshooting

**"rsync: command not found"** — Install rsync: `brew install rsync`

**"Permission denied (publickey)"** — Add your SSH key to the server or check the key path in Preferences.

**"No such file or directory"** — The remote path doesn't exist yet. Create it first:

```bash
ssh uXXXXXXXX@ssh.hosting.ionos.de mkdir -p ~/your-project
```

**Timeout / connection refused** — Check host and port in Preferences. IONOS SSH port is usually 22.

## Author

Werner Deuermeier · [wdeu.de](https://wdeu.de)
