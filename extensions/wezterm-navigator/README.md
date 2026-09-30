# WezTerm Navigator

Navigate, create, and manage WezTerm tabs and workspaces directly from Raycast.

## Features

- **Navigate Tabs** — Browse all WezTerm tabs grouped by workspace with a detail panel showing current directory, terminal size, and pane information
- **Create Tab** — Spawn a new tab with a specific working directory and workspace
- **Manage Workspaces** — View all workspaces with tab/pane counts and rename them
- **Setup IPC** — One-click setup instructions for cross-workspace switching

## Requirements

- [WezTerm](https://wezfurlong.org/wezterm/) must be installed and running
- WezTerm can be installed via Homebrew: `brew install --cask wezterm`

## Setup (Cross-Workspace Switching)

WezTerm's CLI cannot switch workspaces externally — this is a [known limitation](https://github.com/wezterm/wezterm/discussions/3534). To enable cross-workspace navigation, add this snippet to your WezTerm config (`~/.wezterm.lua` or equivalent):

```lua
local wezterm = require("wezterm")

-- Named pipe for Raycast workspace switching
local IPC_FILE = os.getenv("HOME") .. "/.wezterm-workspace-switch"

wezterm.on("update-status", function(window, pane)
  local f = io.open(IPC_FILE, "r")
  if not f then return end
  
  local workspace_name = f:read("*line")
  f:close()
  
  if workspace_name and workspace_name ~= "" then
    -- Switch to the requested workspace
    window:perform_action(
      wezterm.action.SwitchToWorkspace({ name = workspace_name }),
      pane
    )
    -- Clean up the IPC file
    os.remove(IPC_FILE)
  end
end)
```

**Or** run the **Setup WezTerm IPC** command in Raycast to copy this snippet.

### How it works

1. When you select a tab in another workspace from Raycast, it writes the workspace name to `~/.wezterm-workspace-switch`
2. WezTerm polls the pipe via the `update-status` event
3. When data is available, WezTerm switches to that workspace immediately

> **Without this setup**: Tab navigation and creation still work within the current workspace. Only cross-workspace switching requires the snippet above.

## Commands

| Command           | Description                                           |
| ----------------- | ----------------------------------------------------- |
| Navigate Tabs     | List and switch between WezTerm tabs                  |
| Create Tab        | Create a new WezTerm tab in a specific directory      |
| Manage Workspaces | View and rename WezTerm workspaces                    |
| Setup WezTerm IPC | Show setup instructions for cross-workspace switching |

## Keyboard Shortcuts

| Shortcut        | Action        |
| --------------- | ------------- |
| `Enter`         | Switch to tab |
| `Cmd + Opt + R` | Rename        |
| `Cmd + Opt + X` | Close tab     |
| `Cmd + .`       | Copy name     |
