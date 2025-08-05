import { Keyboard } from "@raycast/api";

const Shortcut = {
  ...Keyboard.Shortcut.Common,
  Archive: { key: "a", modifiers: ["cmd", "shift"] },
  ShowOrHide: { key: "h", modifiers: ["cmd", "shift"] },
} satisfies Record<string, Keyboard.Shortcut>;

export default Shortcut;
