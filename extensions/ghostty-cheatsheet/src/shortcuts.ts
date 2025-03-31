import { Shortcut } from "./types";

const shortcuts: Record<string, Shortcut[]> = {
  ["Window Management"]: [
    {
      action: "New window",
      ["Windows/Linux"]: "Ctrl+⇧+N",
      macOS: "⌘+N",
    },
    {
      action: "Close window",
      ["Windows/Linux"]: "Alt+F4",
      macOS: "⌘+⇧+W",
    },
    {
      action: "Close all windows",
      ["Windows/Linux"]: "-",
      macOS: "⌘+⇧+⌥+W",
    },
    {
      action: "Toggle fullscreen",
      ["Windows/Linux"]: "Ctrl+Enter",
      macOS: "⌘+Enter or ⌘+Ctrl+F",
    },
    {
      action: "Quit application",
      ["Windows/Linux"]: "Ctrl+⇧+Q",
      macOS: "⌘+Q",
    },
  ],
  ["Tab Management"]: [
    {
      action: "New tab",
      ["Windows/Linux"]: "Ctrl+⇧+T",
      macOS: "⌘+T",
    },
    {
      action: "Close tab/surface",
      ["Windows/Linux"]: "Ctrl+⇧+W",
      macOS: "⌘+W",
    },
    {
      action: "Previous tab",
      ["Windows/Linux"]: "Ctrl+⇧+Tab, Ctrl+⇧+←, Ctrl+Page Up",
      macOS: "⌘+⇧+[",
    },
    {
      action: "Next tab",
      ["Windows/Linux"]: "Ctrl+Tab, Ctrl+⇧+→, Ctrl+Page Down",
      macOS: "⌘+⇧+]",
    },
    {
      action: "Go to tab 1-8",
      ["Windows/Linux"]: "Alt+[1-8]",
      macOS: "⌘+[1-8]",
    },
    {
      action: "Go to last tab",
      ["Windows/Linux"]: "Alt+9",
      macOS: "⌘+9",
    },
    {
      action: "Move tab",
      ["Windows/Linux"]: "-",
      macOS: "-",
    },
  ],
  ["Split Management"]: [
    {
      action: "New split (right)",
      ["Windows/Linux"]: "Ctrl+⇧+O",
      macOS: "⌘+D",
    },
    {
      action: "New split (down)",
      ["Windows/Linux"]: "Ctrl+⇧+E",
      macOS: "⌘+⇧+D",
    },
    {
      action: "Focus previous split",
      ["Windows/Linux"]: "Ctrl+Super+[",
      macOS: "⌘+[",
    },
    {
      action: "Focus next split",
      ["Windows/Linux"]: "Ctrl+Super+]",
      macOS: "⌘+]",
    },
    {
      action: "Focus split up",
      ["Windows/Linux"]: "Ctrl+Alt+↑",
      macOS: "⌘+⌥+↑",
    },
    {
      action: "Focus split down",
      ["Windows/Linux"]: "Ctrl+Alt+↓",
      macOS: "⌘+⌥+↓",
    },
    {
      action: "Focus split left",
      ["Windows/Linux"]: "Ctrl+Alt+←",
      macOS: "⌘+⌥+←",
    },
    {
      action: "Focus split right",
      ["Windows/Linux"]: "Ctrl+Alt+→",
      macOS: "⌘+⌥+→",
    },
    {
      action: "Toggle split zoom",
      ["Windows/Linux"]: "Ctrl+⇧+Enter",
      macOS: "⌘+⇧+Enter",
    },
    {
      action: "Resize split up",
      ["Windows/Linux"]: "Ctrl+Super+⇧+↑",
      macOS: "⌘+Ctrl+↑",
    },
    {
      action: "Resize split down",
      ["Windows/Linux"]: "Ctrl+Super+⇧+↓",
      macOS: "⌘+Ctrl+↓",
    },
    {
      action: "Resize split left",
      ["Windows/Linux"]: "Ctrl+Super+⇧+←",
      macOS: "⌘+Ctrl+←",
    },
    {
      action: "Resize split right",
      ["Windows/Linux"]: "Ctrl+Super+⇧+→",
      macOS: "⌘+Ctrl+→",
    },
    {
      action: "Equalize splits",
      ["Windows/Linux"]: "Ctrl+Super+⇧+=",
      macOS: "⌘+Ctrl+=",
    },
  ],
  ["Copy & Paste"]: [
    {
      action: "Copy",
      ["Windows/Linux"]: "Ctrl+⇧+C",
      macOS: "⌘+C",
    },
    {
      action: "Paste",
      ["Windows/Linux"]: "Ctrl+⇧+V",
      macOS: "⌘+V",
    },
    {
      action: "Paste from selection",
      ["Windows/Linux"]: "⇧+Insert",
      macOS: "-",
    },
  ],
  ["Text Navigation"]: [
    {
      action: "Scroll to top",
      ["Windows/Linux"]: "⇧+Home",
      macOS: "⌘+Home",
    },
    {
      action: "Scroll to bottom",
      ["Windows/Linux"]: "⇧+End",
      macOS: "⌘+End",
    },
    {
      action: "Scroll page up",
      ["Windows/Linux"]: "⇧+Page Up",
      macOS: "⌘+Page Up",
    },
    {
      action: "Scroll page down",
      ["Windows/Linux"]: "⇧+Page Down",
      macOS: "⌘+Page Down",
    },
    {
      action: "Jump to previous prompt",
      ["Windows/Linux"]: "Ctrl+⇧+Page Up",
      macOS: "⌘+↑",
    },
    {
      action: "Jump to next prompt",
      ["Windows/Linux"]: "Ctrl+⇧+Page Down",
      macOS: "⌘+↓",
    },
    {
      action: "Clear screen",
      ["Windows/Linux"]: "-",
      macOS: "⌘+K",
    },
  ],
  ["Font Size"]: [
    {
      action: "Increase font size",
      ["Windows/Linux"]: "Ctrl++/Ctrl+=",
      macOS: "⌘++/⌘+=",
    },
    {
      action: "Decrease font size",
      ["Windows/Linux"]: "Ctrl+-",
      macOS: "⌘+-",
    },
    {
      action: "Reset font size",
      ["Windows/Linux"]: "Ctrl+0",
      macOS: "⌘+0",
    },
  ],
  ["Configuration"]: [
    {
      action: "Open config",
      ["Windows/Linux"]: "Ctrl+,",
      macOS: "⌘+,",
    },
    {
      action: "Reload config",
      ["Windows/Linux"]: "Ctrl+⇧+,",
      macOS: "⌘+⇧+,",
    },
  ],
  ["Inspector"]: [
    {
      action: "Toggle inspector",
      ["Windows/Linux"]: "Ctrl+⇧+I",
      macOS: "⌘+⌥+I",
    },
  ],
  ["Scrollback"]: [
    {
      action: "Write scrollback to file (paste)",
      ["Windows/Linux"]: "Ctrl+⇧+J",
      macOS: "⌘+⇧+J",
    },
    {
      action: "Write scrollback to file (open)",
      ["Windows/Linux"]: "Ctrl+⇧+Alt+J",
      macOS: "⌘+⇧+⌥+J",
    },
  ],
};

export default shortcuts;
