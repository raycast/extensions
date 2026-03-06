# GPU Fleet Monitor

Monitor GPU and CPU usage across your SSH hosts directly from Raycast. See which machines are free, busy, or offline at a glance, then connect in one keystroke via your preferred terminal or editor.

## Features

- **Live GPU/CPU monitoring** -- probes all SSH hosts in parallel and shows real-time utilization, memory usage, and top process working directories
- **Quick Connect** -- instantly SSH into the best available free GPU host
- **Tmux session management** -- list and attach to remote tmux sessions
- **Add Host** -- parse an SSH connection string and add it to `~/.ssh/config`
- **Multiple terminals** -- Ghostty, iTerm, or macOS Terminal
- **Multiple editors** -- Cursor or VS Code (remote SSH)
- **Work/Personal classification** -- filter hosts by category using name patterns or SSH identity files

## Setup

The extension reads hosts from your `~/.ssh/config` file. No additional API keys or accounts are required.

### Preferences

| Preference | Description |
|---|---|
| **Terminal Application** | Choose between Ghostty, iTerm, or macOS Terminal |
| **Editor Application** | Choose between Cursor or VS Code |
| **Work Host Patterns** | Comma-separated glob patterns (e.g. `gpu-*, ml-*`) to classify hosts as work |
| **Personal Host Patterns** | Glob patterns to classify hosts as personal |
| **Work Identity Files** | SSH identity file paths (e.g. `~/.ssh/work_key`). Hosts using these keys are classified as work |
| **Personal Identity Files** | Identity file paths for personal host classification |
| **Excluded Hosts** | Hostnames to hide from the fleet list (`github.com` is always excluded) |
| **Default Identity File** | Identity file added to new hosts created via the Add Host command |
| **Default View** | Show work, personal, or all hosts by default |
| **SSH Timeout** | Connection timeout in seconds (default: 4) |
| **Refresh Interval** | How often to re-probe hosts in seconds (default: 10) |

### How It Works

The extension SSHes into each host with `BatchMode=yes` and runs a lightweight script that queries `nvidia-smi` for GPU stats and `/proc/stat` for CPU usage. A host is considered **free** if GPU utilization is under 1% and GPU memory usage is under 3%.

### Requirements

- macOS
- SSH access to your GPU hosts (key-based auth with `BatchMode=yes`)
- `nvidia-smi` available on remote hosts (for GPU monitoring)
