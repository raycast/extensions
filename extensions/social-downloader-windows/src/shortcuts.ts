import type { Keyboard } from "@raycast/api";

const defaults = { add: "Ctrl+N", remove: "Ctrl+Shift+Backspace" };
const labels = { ctrl: "Ctrl", alt: "Alt", shift: "Shift" };
export function parseShortcut(value: string): {
  shortcut: Keyboard.Shortcut;
  label: string;
} {
  const parts = value
    .toLowerCase()
    .split("+")
    .map((part) => part.trim());
  const key = parts.pop() ?? "";
  const modifiers = parts.map((part) => (part === "control" ? "ctrl" : part));
  if (
    !modifiers.length ||
    new Set(modifiers).size !== modifiers.length ||
    modifiers.some((part) => !["ctrl", "alt", "shift"].includes(part)) ||
    (!modifiers.includes("ctrl") && !modifiers.includes("alt")) ||
    !/^(?:[a-z0-9]|backspace|delete|deleteforward)$/.test(key)
  )
    throw new Error(
      "Use Ctrl or Alt, optionally Shift, plus a letter, number, or Backspace.",
    );
  if (
    modifiers.length === 1 &&
    modifiers[0] === "ctrl" &&
    /^[acvxyzk]$/.test(key)
  )
    throw new Error("This shortcut is reserved for editing or Actions.");
  const ordered = (["ctrl", "alt", "shift"] as const).filter((modifier) =>
    modifiers.includes(modifier),
  );
  return {
    shortcut: { modifiers: ordered, key: key as Keyboard.KeyEquivalent },
    label: [
      ...ordered.map((modifier) => labels[modifier]),
      key === "backspace"
        ? "Backspace"
        : key.length === 1
          ? key.toUpperCase()
          : key === "deleteforward"
            ? "DeleteForward"
            : "Delete",
    ].join("+"),
  };
}

export function linkShortcuts(add?: string, remove?: string) {
  try {
    const a = parseShortcut(add?.trim() || defaults.add);
    const r = parseShortcut(remove?.trim() || defaults.remove);
    if (a.label === r.label)
      throw new Error("Add and remove shortcuts must be different.");
    return { add: a, remove: r, warning: "" };
  } catch (error) {
    return {
      add: parseShortcut(defaults.add),
      remove: parseShortcut(defaults.remove),
      warning: `${(error as Error).message} Default shortcuts are active. Change them in extension preferences and reopen the command.`,
    };
  }
}
