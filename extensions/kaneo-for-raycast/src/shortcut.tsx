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

const AssignTask: Keyboard.Shortcut = {
  Windows: { modifiers: ["ctrl", "shift"], key: "enter" },
  macOS: { modifiers: ["cmd", "shift"], key: "enter" },
};

const Revalidate: Keyboard.Shortcut = {
  Windows: { modifiers: ["ctrl", "shift"], key: "r" },
  macOS: { modifiers: ["cmd", "shift"], key: "r" },
};

export { ChangeStatus, ChangePriority, CopyTaskTitle, CopyTaskDescription, CopyProjectName, AssignTask, Revalidate };
