import { Keyboard } from "@raycast/api";
import { ShortcutType } from "../models/shortcutType";

export default function getShortcut(shortcutType: ShortcutType): Keyboard.Shortcut | undefined {
  switch (shortcutType) {
    case ShortcutType.COPY_MESSAGE:
      return { modifiers: ["opt"], key: "c" };
    case ShortcutType.PASTE_MESSAGE:
      return { modifiers: ["opt", "shift"], key: "c" };
    case ShortcutType.COPY_BODY:
      return { modifiers: ["opt"], key: "b" };
    case ShortcutType.PASTE_BODY:
      return { modifiers: ["opt", "shift"], key: "b" };
    default:
      return undefined;
  }
}
