# Git Batch Tools

Batch git operations across multiple project groups.

## Features

### Batch Pull

Pull all git repos in a project group with a single action.

- **Parallel Execution** — Configurable concurrency for fast batch operations
- **Safe Pull** — Uses `--ff-only` to avoid unexpected merge commits; diverged repos are reported as errors
- **Status Overview** — Results grouped by status: Failed, Uncommitted Changes, Updated, Up to Date
- **Dirty Repo Detection** — Skips repos with uncommitted changes to avoid conflicts

### Batch Status

View the git status of all repos in a project group at a glance.

- **Ahead/Behind Tracking** — Shows how many commits each repo is ahead or behind its upstream
- **Dirty Detection** — Highlights repos with uncommitted changes
- **Section Grouping** — Repos sorted by status: Dirty, Diverged, Ahead, Behind, No Upstream, Clean
- **Quick Pull** — Pull a single repo directly from the status view

## Setup

1. Install the extension
2. Set **Project Paths** in preferences — comma-separated directories containing your git repos (e.g. `~/dev/work, ~/dev/personal`)
3. Set **Editor** and optionally **Alternate Editor** for quick open actions

## Usage

### Batch Pull

1. Open Raycast and search for **Batch Pull**
2. Select a project group
3. Press `Enter` — all repos will be pulled automatically
4. Review results grouped by status

### Batch Status

1. Open Raycast and search for **Batch Status**
2. Select a project group
3. See the status of every repo at a glance
4. Use actions to open in editor, pull, or copy branch name

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Cmd + E` | Open in Editor |
| `Cmd + Shift + E` | Open in Alternate Editor |
| `Cmd + T` | Open in Terminal |
| `Cmd + Shift + B` | Copy Branch Name |

## Preferences

| Name | Description | Required |
| --- | --- | --- |
| Project Paths | Comma-separated paths to project directories | Yes |
| Editor | Primary editor app for opening projects | No |
| Alternate Editor | Secondary editor app | No |
| Terminal App | Terminal app for opening projects | No |
| Max Parallel Processes | Maximum concurrent git pull processes (default: 10) | No |
