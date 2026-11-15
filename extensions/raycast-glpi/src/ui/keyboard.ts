import { Keyboard } from "@raycast/api";

export const ChangeStatus = <Keyboard.Shortcut>{
  macOS: { modifiers: ["cmd", "shift"], key: "s" },
  Windows: { modifiers: ["ctrl", "shift"], key: "s" },
};

export const PushFolloupView = <Keyboard.Shortcut>{
  macOS: { modifiers: ["cmd", "shift"], key: "return" },
  Windows: { modifiers: ["ctrl", "shift"], key: "return" },
};
