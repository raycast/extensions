import type { Keyboard } from "@raycast/api";

const FORMAT_NAMES: Record<string, string> = {
  figma: "Figma",
  "figma-css": "Figma CSS Syntax",
  "css-bezier": "CSS Bézier",
  "css-linear": "CSS linear() / steps()",
  motion: "Motion",
  swiftui: "SwiftUI",
  compose: "Jetpack Compose",
  tailwind: "Tailwind",
  dtcg: "DTCG",
};

export const SHORTCUT_ACTIONS = [
  ...[
    "figma",
    "figma-css",
    "css-bezier",
    "css-linear",
    "motion",
    "swiftui",
    "compose",
    "tailwind",
    "dtcg",
  ].map((id, index) => ({
    id: `copy:${id}`,
    title: `Copy ${FORMAT_NAMES[id]}`,
    default: `cmd+shift+${index + 1}`,
  })),
  { id: "copy:figma-motion", title: "Copy Figma Motion", default: "cmd+opt+1" },
  {
    id: "copy:motion-time",
    title: "Copy Motion Visual Duration",
    default: "cmd+opt+2",
  },
  ...["Sheet", "Toggle", "Tooltip", "Staggered List"].map((name, index) => ({
    id: `preview:${name}`,
    title: `Preview on ${name}`,
    default: `ctrl+${index + 1}`,
  })),
  { id: "confirm", title: "Confirm Input and Preview", default: "cmd+return" },
];
export type ShortcutSettings = Record<string, string>;
export const DEFAULT_SHORTCUTS: ShortcutSettings = Object.fromEntries(
  SHORTCUT_ACTIONS.map((a) => [a.id, a.default]),
);
export const SHORTCUT_STORAGE = "shortcuts-v1";
export function preferenceName(id: string) {
  return `shortcut_${id.replace(/[^a-z0-9]/gi, "_").toLowerCase()}`;
}
// Preferences cannot be written through the SDK. Empty fields inherit the
// previous saved binding (or default); "none" explicitly disables an action.
export function resolveShortcuts(
  preferences: Record<string, string | undefined>,
  legacy: ShortcutSettings = {},
) {
  return validateShortcuts(
    Object.fromEntries(
      SHORTCUT_ACTIONS.map((action) => {
        const configured = preferences[preferenceName(action.id)]?.trim();
        return [
          action.id,
          configured?.toLowerCase() === "none"
            ? ""
            : configured ||
              legacy[action.id] ||
              (legacy[action.id] === "" ? "" : action.default),
        ];
      }),
    ),
  );
}
const modifiers = ["cmd", "ctrl", "opt", "shift"] as const;
export function parseShortcut(
  value: string,
):
  | { modifiers: Keyboard.KeyModifier[]; key: Keyboard.KeyEquivalent }
  | undefined {
  if (!value.trim()) return undefined;
  const tokens = value
    .toLowerCase()
    .split("+")
    .map((v) => v.trim());
  const key = tokens.pop()!;
  if (
    !/^(?:[a-z0-9]|return)$/.test(key) ||
    !tokens.length ||
    new Set(tokens).size !== tokens.length ||
    tokens.some((t) => !modifiers.includes(t as (typeof modifiers)[number]))
  )
    throw new Error(
      "Use modifiers + key, e.g. cmd+shift+3; blank disables it.",
    );
  const sorted = modifiers.filter((m) => tokens.includes(m));
  if (sorted.every((m) => m === "shift"))
    throw new Error("Include cmd, ctrl or opt.");
  if (
    sorted.length === 1 &&
    sorted[0] === "cmd" &&
    ["k", "q", "w", "c", "v", "x", "a"].includes(key)
  )
    throw new Error("Reserved for Raycast or text editing.");
  return { modifiers: sorted, key: key as Keyboard.KeyEquivalent };
}
export function validateShortcuts(values: ShortcutSettings): ShortcutSettings {
  const normalized: ShortcutSettings = {},
    used = new Map<string, string>();
  for (const action of SHORTCUT_ACTIONS) {
    const parsed = parseShortcut(values[action.id] ?? action.default);
    const value = parsed ? [...parsed.modifiers, parsed.key].join("+") : "";
    if (value && used.has(value))
      throw new Error(`${action.title} conflicts with ${used.get(value)}.`);
    if (value) used.set(value, action.title);
    normalized[action.id] = value;
  }
  return normalized;
}
export function durationSeconds(text: string) {
  if (!/^\d+$/.test(text.trim()))
    throw new Error("Enter whole milliseconds, e.g. 500.");
  const ms = Number(text.trim());
  if (ms < 1 || ms > 10000) throw new Error("Use 1–10000 ms.");
  return ms / 1000;
}
