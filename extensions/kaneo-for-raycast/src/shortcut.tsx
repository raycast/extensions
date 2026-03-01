import { Keyboard } from "@raycast/api";

const ChangeStatus: Keyboard.Shortcut = {
  Windows: { modifiers: ["ctrl", "shift"], key: "s" },
  macOS: { modifiers: ["cmd", "shift"], key: "s" },
};

const ChangePriority: Keyboard.Shortcut = {
  Windows: { modifiers: ["ctrl", "shift"], key: "p" },
  macOS: { modifiers: ["cmd", "shift"], key: "p" },
};

const CopyTaskTitle: Keyboard.Shortcut = {
  modifiers: ["shift"],
  key: "t",
};

const CopyTaskDescription: Keyboard.Shortcut = {
  modifiers: ["shift"],
  key: "d",
};

const CopyProjectName: Keyboard.Shortcut = {
  modifiers: ["shift"],
  key: "p",
};

export { ChangeStatus, ChangePriority, CopyTaskTitle, CopyTaskDescription, CopyProjectName };
