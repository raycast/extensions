import { Keyboard } from "@raycast/api";
import { ShortcutType } from "../models/shortcutType";

export default function getShortcut(shortcutType: ShortcutType): Keyboard.Shortcut | undefined {
  switch (shortcutType) {
    case ShortcutType.COPY_MESSAGE:
      return { modifiers: ["cmd", "shift"], key: "c" };
    case ShortcutType.PASTE_MESSAGE:
      return { modifiers: ["cmd", "opt"], key: "c" };
    case ShortcutType.COPY_BODY:
      return { modifiers: ["cmd", "shift"], key: "b" };
    case ShortcutType.PASTE_BODY:
      return { modifiers: ["cmd", "opt"], key: "b" };
    default:
      return undefined;
  }
}
