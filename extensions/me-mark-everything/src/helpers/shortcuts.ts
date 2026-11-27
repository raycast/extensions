import type { Keyboard } from "@raycast/api";

type Shortcut = Extract<Keyboard.Shortcut, { key: Keyboard.KeyEquivalent }>;

import manifest from "../../package.json";
export const shortcutNames = [
  "shortcutOpen",
  "shortcutCopy",
  "shortcutDetails",
  "shortcutEdit",
  "shortcutTrash",
  "shortcutManager",
  "shortcutRefresh",
  "shortcutSave",
  "shortcutAddUrl",
  "shortcutRemoveUrl",
] as const;
export type ShortcutName = (typeof shortcutNames)[number];
export type Shortcuts = Record<ShortcutName, Shortcut | undefined>;

const modifierOrder = ["cmd", "ctrl", "opt", "shift"] as const;
const modifiers: Record<string, (typeof modifierOrder)[number]> = {
  cmd: "cmd",
  command: "cmd",
  ctrl: "ctrl",
  control: "ctrl",
  opt: "opt",
  option: "opt",
  alt: "opt",
  shift: "shift",
};
const namedKeys: Keyboard.KeyEquivalent[] = [
  "return",
  "delete",
  "deleteForward",
  "tab",
  "arrowUp",
  "arrowDown",
  "arrowLeft",
  "arrowRight",
  "pageUp",
  "pageDown",
  "home",
  "end",
  "space",
  "escape",
  "enter",
  "backspace",
];

export function parseShortcut(value: string): Shortcut | undefined {
  const input = value.trim().toLowerCase();
  if (!input || input === "none") return undefined;
  const parts = input.split("+").map((part) => part.trim());
  const keyText = parts.pop()!;
  const mods = parts.map((part) => modifiers[part]);
  if (
    !mods.length ||
    mods.some((mod) => !mod) ||
    new Set(mods).size !== mods.length ||
    !mods.some((mod) => mod !== "shift")
  ) {
    throw new Error("Use cmd, ctrl or opt plus a key, e.g. cmd+shift+x. Use none to disable.");
  }
  const key =
    namedKeys.find((name) => name.toLowerCase() === keyText) ??
    (/^[a-z0-9.,;=\-[\]{}()/\\'`^@$]$/.test(keyText) ? (keyText as Keyboard.KeyEquivalent) : undefined);
  if (!key) throw new Error(`Unsupported key: ${keyText || "(missing)"}. Example: ctrl+shift+x.`);
  const shortcut = { modifiers: modifierOrder.filter((mod) => mods.includes(mod)), key };
  const signature = shortcutSignature(shortcut);
  if (["cmd+k", "cmd+,", "cmd+return", "cmd+enter", "cmd+shift+return", "cmd+shift+enter"].includes(signature)) {
    throw new Error("This shortcut is reserved by Raycast. Choose another combination.");
  }
  return shortcut;
}

function shortcutSignature(shortcut: Shortcut) {
  const key = shortcut.key === "backspace" ? "delete" : shortcut.key === "enter" ? "return" : shortcut.key;
  return [...shortcut.modifiers, key].join("+");
}

export function resolveShortcuts(values: Partial<Record<ShortcutName, string>>): Shortcuts {
  const result = {} as Shortcuts;
  const labels = {} as Record<ShortcutName, string>;
  for (const name of shortcutNames) {
    const preference = manifest.preferences.find((item) => item.name === name);
    if (!preference) throw new Error(`Missing shortcut preference: ${name}`);
    labels[name] = preference.title;
    try {
      result[name] = parseShortcut(values[name] ?? preference.default ?? "");
    } catch (cause) {
      throw new Error(`${preference.title}: ${(cause as Error).message}`);
    }
  }
  // Edit and Save belong to different screens and may share a combination.
  const contexts: ShortcutName[][] = [
    [
      "shortcutOpen",
      "shortcutCopy",
      "shortcutDetails",
      "shortcutEdit",
      "shortcutTrash",
      "shortcutManager",
      "shortcutRefresh",
    ],
    ["shortcutSave", "shortcutTrash", "shortcutManager", "shortcutRefresh"],
    ["shortcutSave", "shortcutAddUrl", "shortcutRemoveUrl", "shortcutManager", "shortcutRefresh"],
  ];
  for (const context of contexts) {
    const seen = new Map<string, ShortcutName>();
    for (const name of context) {
      const shortcut = result[name];
      if (!shortcut) continue;
      const signature = shortcutSignature(shortcut);
      const previous = seen.get(signature);
      if (previous)
        throw new Error(`${labels[previous]} and ${labels[name]} both use ${signature}. Choose different shortcuts.`);
      seen.set(signature, name);
    }
  }
  return result;
}
