# cmux Sessionizer

Fuzzy-find git projects and open them as [cmux](https://cmux.com) workspaces. Inspired by tmux-sessionizer.

## Prerequisites

- [cmux](https://cmux.com) must be installed
- cmux **Automation mode** must be set to **"Allow all"** in cmux Settings (`Cmd+,`)

## Setup

1. Install the extension
2. Open the extension preferences and set your **Source Directories** (comma-separated paths to scan, e.g. `~/src,~/projects`)
3. Optionally adjust the **Max Search Depth**
4. Assign a hotkey for instant access: search for "Open Project", press `Cmd+K`, and select "Set Hotkey"

## Usage

- Trigger the command via Raycast (or your assigned hotkey)
- Search for a project by name
- Press Enter to open it as a cmux workspace
- If a workspace already exists for that project, it switches to it instead of creating a duplicate
