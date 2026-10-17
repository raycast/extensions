import { Keyboard } from "@raycast/api";

const Shortcut = {
  ...Keyboard.Shortcut.Common,
  Archive: { macOS: { key: "a", modifiers: ["cmd", "shift"] }, Windows: { key: "a", modifiers: ["ctrl", "shift"] } },
  ShowOrHide: { macOS: { key: "h", modifiers: ["cmd", "shift"] }, Windows: { key: "h", modifiers: ["ctrl", "shift"] } },
} satisfies Record<string, Keyboard.Shortcut>;

export default Shortcut;
