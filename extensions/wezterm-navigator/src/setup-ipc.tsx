import { Action, ActionPanel, Detail, Icon } from "@raycast/api";

const LUA_SNIPPET = `
-- ==========================================
-- Raycast Navigator IPC
-- Enables switching workspaces from Raycast
-- ==========================================

local wezterm = require("wezterm")

-- Poll interval in milliseconds (lower = more responsive, higher = less CPU)
config.status_update_interval = 100

-- IPC file path (must match Raycast extension)
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
`.trim();

const MARKDOWN = `
# Setup Cross-Workspace Switching

WezTerm's CLI cannot switch workspaces externally — this is a [known limitation](https://github.com/wezterm/wezterm/discussions/3534).

To enable cross-workspace navigation from Raycast, add the following snippet to your WezTerm config (\`~/.wezterm.lua\` or equivalent):

\`\`\`lua
${LUA_SNIPPET}
\`\`\`

## How It Works

1. When you select a tab in another workspace from Raycast, it writes the workspace name to \`~/.wezterm-workspace-switch\`
2. WezTerm polls this file every 100ms via the \`update-status\` event
3. When found, WezTerm switches to that workspace and deletes the file

## Without This Setup

- **Navigate Tabs** works within the current workspace only
- **Create Tab** creates tabs but won't switch to the target workspace
- **Manage Workspaces** works fully (rename, view counts)
`;

export default function SetupIpc() {
  return (
    <Detail
      markdown={MARKDOWN}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Lua Snippet" content={LUA_SNIPPET} icon={Icon.Clipboard} />
          <Action.OpenInBrowser
            title="Open Wezterm Config"
            url={`file://${process.env.HOME}/.wezterm.lua`}
            icon={Icon.Document}
          />
        </ActionPanel>
      }
    />
  );
}
