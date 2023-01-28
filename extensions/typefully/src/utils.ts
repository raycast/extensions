import { Color, Keyboard } from "@raycast/api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export function getRelativeDate(date: string | Date) {
  return dayjs().to(date);
}

export function getTypefullyIcon(tinted = false) {
  const overrideTintColor = tinted ? Color.Blue : undefined;
  return {
    source: "black-feather.svg",
    tintColor: overrideTintColor ? overrideTintColor : { light: "#000000", dark: "#FFFFFF" },
  };
}

export function getMenuBarExtraItemShortcut(index: number) {
  const key = index + 1;

  let shortcut: Keyboard.Shortcut | undefined;
  if (key >= 1 && key <= 9) {
    shortcut = { modifiers: ["cmd"], key: String(key) as Keyboard.KeyEquivalent };
  }

  return shortcut;
}
