import { Keyboard } from "@raycast/api";

export function getShortcut(index: number) {
  const key = index + 1;

  let shortcut: Keyboard.Shortcut | undefined;
  if (key >= 1 && key <= 9) {
    shortcut = { modifiers: ["cmd"], key: String(key) as Keyboard.KeyEquivalent };
  }

  return shortcut;
}

export function formatString(str: string): string {
  const newString = str.split("_").join(" ").toLowerCase();

  return newString.charAt(0).toUpperCase() + newString.slice(1);
}

export function formatDate(dateString: string) {
  const date = new Date(dateString);
  const datePart = date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return datePart;
}
