# Git Toolkit

Batch pull git repositories across multiple project groups.

## Features

- **Batch Pull** — Pull all git repos in a directory with a single action
- **Parallel Execution** — Configurable concurrency for fast batch operations
- **Smart Retry** — Automatically retries with `--ff-only` up to 3 times, falls back to normal `git pull`
- **Status Overview** — Results grouped by status: Failed, Uncommitted Changes, Updated, Up to Date
- **Open in Editor** — Quickly open any repo in your preferred editor via keyboard shortcut
- **Dirty Repo Detection** — Skips repos with uncommitted changes to avoid conflicts

## Setup

1. Install the extension
2. Set **Project Paths** in preferences — comma-separated directories containing your git repos (e.g. `~/dev/matahari, ~/dev/xitment`)
3. Set **Editor** and optionally **Alternate Editor** for quick open actions

## Usage

1. Open Raycast and search for **Batch Pull**
2. Select a project group from the list
3. Press `Enter` — all repos in that group will be pulled automatically
4. Review the results grouped by status

### Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Enter` | Pull selected repo |
| `Cmd + E` | Open in Editor |
| `Cmd + Shift + E` | Open in Alternate Editor |

## Preferences

| Name | Description | Required |
| --- | --- | --- |
| Project Paths | Comma-separated paths to project directories | Yes |
| Editor | Primary editor app for opening projects | Yes |
| Alternate Editor | Secondary editor app | No |
| Max Parallel Processes | Maximum concurrent git pull processes (default: 10) | No |
