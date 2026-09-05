import { Action, ActionPanel, List } from "@raycast/api";
import { runOmniWM } from "./omniwm";

type Category =
  | "Raycast Style"
  | "Navigation"
  | "Workspaces"
  | "Move Windows"
  | "Move Columns"
  | "Resize"
  | "Layouts"
  | "Utilities";

type CommandDefinition = {
  title: string;
  description: string;
  category: Category;
  steps: string[][];
  keywords?: string[];
};

const command = (
  title: string,
  description: string,
  category: Category,
  ...args: string[]
): CommandDefinition => ({ title, description, category, steps: [args] });

const sequence = (
  title: string,
  description: string,
  category: Category,
  ...steps: string[][]
): CommandDefinition => ({ title, description, category, steps });

const fixedCommands: CommandDefinition[] = [
  command(
    "Maximize",
    "Toggle the current tiled column across the full available width",
    "Raycast Style",
    "command",
    "toggle-container-full-primary-span",
  ),
  sequence(
    "Reset",
    "Return the window to a neutral standalone tiled state",
    "Raycast Style",
    ["command", "set-container-primary-span", "50%"],
    ["command", "reset-window-secondary-span"],
  ),
  command(
    "Maximize Width",
    "Toggle full width for the focused column",
    "Raycast Style",
    "command",
    "toggle-container-full-primary-span",
  ),
  command(
    "Maximize Height",
    "Use the maximum available height while remaining tiled",
    "Raycast Style",
    "command",
    "set-window-secondary-span",
    "100%",
  ),
  command(
    "Left Half",
    "Set the current column to half width without moving it",
    "Raycast Style",
    "command",
    "set-container-primary-span",
    "50%",
  ),
  command(
    "Right Half",
    "Set the current column to half width without moving it",
    "Raycast Style",
    "command",
    "set-container-primary-span",
    "50%",
  ),
  command(
    "One Quarter",
    "Set the current column to one-quarter width without moving it",
    "Raycast Style",
    "command",
    "set-container-primary-span",
    "25%",
  ),
  command(
    "Three Quarters",
    "Set the current column to three-quarters width without moving it",
    "Raycast Style",
    "command",
    "set-container-primary-span",
    "75%",
  ),
  sequence(
    "Top Left",
    "Join the column on the left and move to the top",
    "Raycast Style",
    ["command", "consume-or-expel-window-left"],
    ["command", "move-window-up"],
  ),
  sequence(
    "Top Right",
    "Join the column on the right and move to the top",
    "Raycast Style",
    ["command", "consume-or-expel-window-right"],
    ["command", "move-window-up"],
  ),
  command(
    "Bottom Left",
    "Join the column on the left at the bottom",
    "Raycast Style",
    "command",
    "consume-or-expel-window-left",
  ),
  command(
    "Bottom Right",
    "Join the column on the right at the bottom",
    "Raycast Style",
    "command",
    "consume-or-expel-window-right",
  ),
  sequence(
    "Center Half",
    "Use a centered half-width column",
    "Raycast Style",
    ["command", "set-container-primary-span", "50%"],
    ["command", "center-column"],
  ),
  sequence(
    "First Third",
    "Use a one-third column on the left",
    "Raycast Style",
    ["command", "set-container-primary-span", "33.333%"],
    ["command", "move-column-to-first"],
  ),
  sequence(
    "Center Third",
    "Use a centered one-third column",
    "Raycast Style",
    ["command", "set-container-primary-span", "33.333%"],
    ["command", "center-column"],
  ),
  sequence(
    "Last Third",
    "Use a one-third column on the right",
    "Raycast Style",
    ["command", "set-container-primary-span", "33.333%"],
    ["command", "move-column-to-last"],
  ),
  sequence(
    "First Two Thirds",
    "Use a two-thirds column on the left",
    "Raycast Style",
    ["command", "set-container-primary-span", "66.667%"],
    ["command", "move-column-to-first"],
  ),
  sequence(
    "Last Two Thirds",
    "Use a two-thirds column on the right",
    "Raycast Style",
    ["command", "set-container-primary-span", "66.667%"],
    ["command", "move-column-to-last"],
  ),
  command(
    "Center",
    "Center the focused column",
    "Raycast Style",
    "command",
    "center-column",
  ),
  command(
    "Move Left",
    "Move the entire focused column left",
    "Raycast Style",
    "command",
    "move-column",
    "left",
  ),
  command(
    "Move Right",
    "Move the entire focused column right",
    "Raycast Style",
    "command",
    "move-column",
    "right",
  ),
  command(
    "Move Up",
    "Move the focused window up in its column",
    "Raycast Style",
    "command",
    "move-window-up",
  ),
  command(
    "Move Down",
    "Move the focused window down in its column",
    "Raycast Style",
    "command",
    "move-window-down",
  ),
  command(
    "Move to Display Left",
    "Move the focused window to the display on the left",
    "Raycast Style",
    "command",
    "move-to-monitor",
    "left",
  ),
  command(
    "Move to Display Right",
    "Move the focused window to the display on the right",
    "Raycast Style",
    "command",
    "move-to-monitor",
    "right",
  ),

  command(
    "Focus Window Left",
    "Navigate to the window on the left",
    "Navigation",
    "command",
    "focus",
    "left",
  ),
  command(
    "Focus Window Right",
    "Navigate to the window on the right",
    "Navigation",
    "command",
    "focus",
    "right",
  ),
  command(
    "Focus Window Up",
    "Navigate to the window above",
    "Navigation",
    "command",
    "focus",
    "up",
  ),
  command(
    "Focus Window Down",
    "Navigate to the window below",
    "Navigation",
    "command",
    "focus",
    "down",
  ),
  command(
    "Focus Previous Window",
    "Return to the last focused window",
    "Navigation",
    "command",
    "focus",
    "previous",
  ),
  command(
    "Focus First Column",
    "Focus the first column",
    "Navigation",
    "command",
    "focus-column",
    "first",
  ),
  command(
    "Focus Last Column",
    "Focus the last column",
    "Navigation",
    "command",
    "focus-column",
    "last",
  ),
  command(
    "Focus Top Window in Column",
    "Focus the top window in this column",
    "Navigation",
    "command",
    "focus-window",
    "top",
  ),
  command(
    "Focus Bottom Window in Column",
    "Focus the bottom window in this column",
    "Navigation",
    "command",
    "focus-window",
    "bottom",
  ),
  command(
    "Focus Next Window or Workspace",
    "Move down, continuing to the next workspace",
    "Navigation",
    "command",
    "focus-window-or-workspace-down",
  ),
  command(
    "Focus Previous Window or Workspace",
    "Move up, continuing to the previous workspace",
    "Navigation",
    "command",
    "focus-window-or-workspace-up",
  ),
  command(
    "Center Focused Column",
    "Center the current column on screen",
    "Navigation",
    "command",
    "center-column",
  ),
  command(
    "Center Visible Columns",
    "Center all visible columns",
    "Navigation",
    "command",
    "center-visible-columns",
  ),
  command(
    "Focus Previous Monitor",
    "Focus the previous display",
    "Navigation",
    "command",
    "focus-monitor",
    "prev",
  ),
  command(
    "Focus Next Monitor",
    "Focus the next display",
    "Navigation",
    "command",
    "focus-monitor",
    "next",
  ),
  command(
    "Focus Last Monitor",
    "Return to the last focused display",
    "Navigation",
    "command",
    "focus-monitor",
    "last",
  ),

  command(
    "Next Workspace",
    "Switch to the next workspace",
    "Workspaces",
    "command",
    "switch-workspace",
    "next",
  ),
  command(
    "Previous Workspace",
    "Switch to the previous workspace",
    "Workspaces",
    "command",
    "switch-workspace",
    "prev",
  ),
  command(
    "Last Workspace",
    "Switch back and forth between workspaces",
    "Workspaces",
    "command",
    "switch-workspace",
    "back-and-forth",
  ),
  command(
    "Move Window to Workspace Above",
    "Send the focused window up one workspace",
    "Workspaces",
    "command",
    "move-to-workspace",
    "up",
  ),
  command(
    "Move Window to Workspace Below",
    "Send the focused window down one workspace",
    "Workspaces",
    "command",
    "move-to-workspace",
    "down",
  ),
  command(
    "Move Column to Workspace Above",
    "Send the focused column up one workspace",
    "Workspaces",
    "command",
    "move-column-to-workspace",
    "up",
  ),
  command(
    "Move Column to Workspace Below",
    "Send the focused column down one workspace",
    "Workspaces",
    "command",
    "move-column-to-workspace",
    "down",
  ),

  command(
    "Move Window Left",
    "Move the focused window left",
    "Move Windows",
    "command",
    "move",
    "left",
  ),
  command(
    "Move Window Right",
    "Move the focused window right",
    "Move Windows",
    "command",
    "move",
    "right",
  ),
  command(
    "Move Window Up",
    "Move the focused window up",
    "Move Windows",
    "command",
    "move",
    "up",
  ),
  command(
    "Move Window Down",
    "Move the focused window down",
    "Move Windows",
    "command",
    "move",
    "down",
  ),
  command(
    "Move Window to Monitor Left",
    "Send the window to the display on the left",
    "Move Windows",
    "command",
    "move-to-monitor",
    "left",
  ),
  command(
    "Move Window to Monitor Right",
    "Send the window to the display on the right",
    "Move Windows",
    "command",
    "move-to-monitor",
    "right",
  ),
  command(
    "Move Window to Monitor Above",
    "Send the window to the display above",
    "Move Windows",
    "command",
    "move-to-monitor",
    "up",
  ),
  command(
    "Move Window to Monitor Below",
    "Send the window to the display below",
    "Move Windows",
    "command",
    "move-to-monitor",
    "down",
  ),
  command(
    "Add Window to Column on Left",
    "Join or remove the window from the column on the left",
    "Move Windows",
    "command",
    "consume-or-expel-window-left",
  ),
  command(
    "Add Window to Column on Right",
    "Join or remove the window from the column on the right",
    "Move Windows",
    "command",
    "consume-or-expel-window-right",
  ),
  command(
    "Add Window to Current Column",
    "Place the focused window inside the current column",
    "Move Windows",
    "command",
    "consume-window-into-column",
  ),
  command(
    "Remove Window from Column",
    "Give the focused window its own column",
    "Move Windows",
    "command",
    "expel-window-from-column",
  ),

  command(
    "Move Column Left",
    "Move the entire focused column left",
    "Move Columns",
    "command",
    "move-column",
    "left",
  ),
  command(
    "Move Column Right",
    "Move the entire focused column right",
    "Move Columns",
    "command",
    "move-column",
    "right",
  ),
  command(
    "Move Column Up",
    "Move the entire focused column up",
    "Move Columns",
    "command",
    "move-column",
    "up",
  ),
  command(
    "Move Column Down",
    "Move the entire focused column down",
    "Move Columns",
    "command",
    "move-column",
    "down",
  ),
  command(
    "Move Column to Start",
    "Move the focused column to the first position",
    "Move Columns",
    "command",
    "move-column-to-first",
  ),
  command(
    "Move Column to End",
    "Move the focused column to the last position",
    "Move Columns",
    "command",
    "move-column-to-last",
  ),

  command(
    "Next Column Width",
    "Cycle the focused column through width presets",
    "Resize",
    "command",
    "cycle-size",
    "forward",
  ),
  command(
    "Previous Column Width",
    "Cycle backward through column width presets",
    "Resize",
    "command",
    "cycle-size",
    "backward",
  ),
  command(
    "Increase Window Width",
    "Increase this window's width inside its column",
    "Resize",
    "command",
    "cycle-window-primary-span",
    "forward",
  ),
  command(
    "Decrease Window Width",
    "Decrease this window's width inside its column",
    "Resize",
    "command",
    "cycle-window-primary-span",
    "backward",
  ),
  command(
    "Increase Window Height",
    "Increase this window's height inside its column",
    "Resize",
    "command",
    "cycle-window-secondary-span",
    "forward",
  ),
  command(
    "Decrease Window Height",
    "Decrease this window's height inside its column",
    "Resize",
    "command",
    "cycle-window-secondary-span",
    "backward",
  ),
  command(
    "Toggle Full Width Column",
    "Make the column full width or restore its prior width",
    "Resize",
    "command",
    "toggle-container-full-primary-span",
  ),
  command(
    "Expand Column to Available Width",
    "Use all currently available horizontal space",
    "Resize",
    "command",
    "expand-container-to-available-primary-span",
  ),
  command(
    "Reset Window Height",
    "Restore the window's default height in its column",
    "Resize",
    "command",
    "reset-window-secondary-span",
  ),
  command(
    "Balance Window Sizes",
    "Make tiled windows evenly sized",
    "Resize",
    "command",
    "balance-sizes",
  ),
  command(
    "Grow Horizontally",
    "Grow the focused tile horizontally",
    "Resize",
    "command",
    "resize",
    "horizontal",
    "grow",
  ),
  command(
    "Shrink Horizontally",
    "Shrink the focused tile horizontally",
    "Resize",
    "command",
    "resize",
    "horizontal",
    "shrink",
  ),
  command(
    "Grow Vertically",
    "Grow the focused tile vertically",
    "Resize",
    "command",
    "resize",
    "vertical",
    "grow",
  ),
  command(
    "Shrink Vertically",
    "Shrink the focused tile vertically",
    "Resize",
    "command",
    "resize",
    "vertical",
    "shrink",
  ),
  command(
    "Grow Focused Window",
    "Grow the focused tile using the current layout",
    "Resize",
    "command",
    "resize-focused",
    "grow",
  ),
  command(
    "Shrink Focused Window",
    "Shrink the focused tile using the current layout",
    "Resize",
    "command",
    "resize-focused",
    "shrink",
  ),

  command(
    "Toggle OmniWM Full Screen",
    "Enter or leave OmniWM full screen and restore the prior tile",
    "Layouts",
    "command",
    "toggle-fullscreen",
  ),
  command(
    "Toggle Native macOS Full Screen",
    "Enter or leave native macOS full screen",
    "Layouts",
    "command",
    "toggle-native-fullscreen",
  ),
  command(
    "Tile or Float Focused Window",
    "Toggle the focused window between tiled and floating",
    "Layouts",
    "command",
    "toggle-focused-window-floating",
  ),
  command(
    "Toggle Tabbed Column",
    "Show windows in this column as tabs",
    "Layouts",
    "command",
    "toggle-column-tabbed",
  ),
  command(
    "Move Window to Root",
    "Promote the window to the layout root",
    "Layouts",
    "command",
    "move-to-root",
  ),
  command(
    "Toggle Split Direction",
    "Change the current split direction",
    "Layouts",
    "command",
    "toggle-split",
  ),
  command(
    "Swap Split",
    "Swap the two sides of the current split",
    "Layouts",
    "command",
    "swap-split",
  ),
  command(
    "Toggle Workspace Layout",
    "Switch this workspace between layout modes",
    "Layouts",
    "command",
    "toggle-workspace-layout",
  ),
  command(
    "Use Niri Layout",
    "Use the scrolling column layout in this workspace",
    "Layouts",
    "command",
    "set-workspace-layout",
    "niri",
  ),
  command(
    "Use Dwindle Layout",
    "Use the recursive split layout in this workspace",
    "Layouts",
    "command",
    "set-workspace-layout",
    "dwindle",
  ),
  command(
    "Use Default Layout",
    "Return this workspace to the configured default layout",
    "Layouts",
    "command",
    "set-workspace-layout",
    "default",
  ),
  command(
    "Toggle Overview",
    "Show or hide OmniWM's window overview",
    "Layouts",
    "command",
    "toggle-overview",
  ),

  command(
    "Open OmniWM Command Palette",
    "Use OmniWM's built-in searchable command list",
    "Utilities",
    "command",
    "open-command-palette",
  ),
  command(
    "Open OmniWM Menu",
    "Open the OmniWM menu near the pointer",
    "Utilities",
    "command",
    "open-menu-anywhere",
  ),
  command(
    "Rescue Offscreen Windows",
    "Bring unreachable windows back on screen",
    "Utilities",
    "command",
    "rescue-offscreen-windows",
  ),
  command(
    "Show Floating Windows",
    "Raise all floating windows",
    "Utilities",
    "command",
    "raise-all-floating-windows",
  ),
  command(
    "Assign Scratchpad Window",
    "Assign the focused window to the scratchpad",
    "Utilities",
    "command",
    "scratchpad",
    "assign",
  ),
  command(
    "Toggle Scratchpad",
    "Show or hide the scratchpad window",
    "Utilities",
    "command",
    "scratchpad",
    "toggle",
  ),
  command(
    "Toggle Quake Terminal",
    "Show or hide OmniWM's quake terminal",
    "Utilities",
    "command",
    "toggle-quake-terminal",
  ),
  command(
    "Toggle Workspace Bar",
    "Show or hide the workspace bar",
    "Utilities",
    "command",
    "toggle-workspace-bar",
  ),
  command(
    "Toggle System Stats",
    "Show or hide OmniWM system statistics",
    "Utilities",
    "command",
    "toggle-system-stats",
  ),
];

const numberedWorkspaceCommands: CommandDefinition[] = Array.from(
  { length: 9 },
  (_, index) => index + 1,
).flatMap((workspace) => [
  command(
    `Focus Workspace ${workspace}`,
    `Switch to workspace ${workspace}`,
    "Workspaces",
    "command",
    "switch-workspace",
    String(workspace),
  ),
  command(
    `Move Window to Workspace ${workspace}`,
    `Send the focused window to workspace ${workspace}`,
    "Workspaces",
    "command",
    "move-to-workspace",
    String(workspace),
  ),
  command(
    `Move Column to Workspace ${workspace}`,
    `Send the focused column to workspace ${workspace}`,
    "Workspaces",
    "command",
    "move-column-to-workspace",
    String(workspace),
  ),
]);

const commands = [...fixedCommands, ...numberedWorkspaceCommands];
const categories: Category[] = [
  "Raycast Style",
  "Navigation",
  "Workspaces",
  "Move Windows",
  "Move Columns",
  "Resize",
  "Layouts",
  "Utilities",
];

async function execute(item: CommandDefinition) {
  await runOmniWM(item.title, item.steps);
}

export default function Commands() {
  return (
    <List searchBarPlaceholder="Search OmniWM commands in English...">
      {categories.map((category) => (
        <List.Section key={category} title={category}>
          {commands
            .filter((item) => item.category === category)
            .map((item) => (
              <List.Item
                key={`${item.title}:${item.steps.flat().join(" ")}`}
                title={item.title}
                subtitle={item.description}
                keywords={item.keywords}
                actions={
                  <ActionPanel>
                    <Action
                      title={`Run ${item.title}`}
                      onAction={() => execute(item)}
                    />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}
