import type { Keyboard } from "@raycast/api";
import { actionDefinitions, type ActionId } from "./actions";

export type ShortcutOverrides = Partial<Record<ActionId, string | null>>;
export const shortcutStorageKey = "browser-shortcuts-v1";
const modifiers = ["cmd", "ctrl", "opt", "shift"] as const;
const aliases: Record<string, string> = {
  command: "cmd",
  control: "ctrl",
  option: "opt",
  alt: "opt",
  enter: "return",
};

export function normalizeShortcut(value: string): string {
  const parts = value
    .toLowerCase()
    .split("+")
    .map((part) => part.trim())
    .map((part) => aliases[part] ?? part);
  const key = parts.pop() ?? "";
  if (!/^[a-z0-9]$/.test(key) && key !== "return")
    throw new Error("Use a letter, number, or Enter as the key.");
  if (
    !parts.length ||
    new Set(parts).size !== parts.length ||
    parts.some(
      (part) => !modifiers.includes(part as (typeof modifiers)[number]),
    )
  )
    throw new Error(
      "Use cmd, ctrl, opt, or shift without repeating modifiers.",
    );
  if (parts.every((part) => part === "shift") && key !== "return")
    throw new Error(
      "Add cmd, ctrl, or opt to avoid interfering with text input.",
    );
  const normalized = [
    ...modifiers.filter((modifier) => parts.includes(modifier)),
    key,
  ].join("+");
  if (
    [
      "cmd+return",
      "cmd+k",
      "cmd+v",
      "cmd+x",
      "cmd+a",
      "cmd+z",
      "cmd+shift+z",
      "cmd+f",
      "cmd+w",
      "cmd+q",
      "cmd+h",
      "cmd+m",
      "ctrl+n",
      "ctrl+p",
      "ctrl+a",
      "ctrl+e",
      "ctrl+b",
      "ctrl+f",
      "ctrl+h",
      "ctrl+d",
      "ctrl+k",
      "ctrl+u",
      "ctrl+t",
      "ctrl+w",
    ].includes(normalized)
  )
    throw new Error(
      "This shortcut is reserved by Raycast or the search field. Choose another combination.",
    );
  return normalized;
}

export function effectiveShortcuts(
  overrides: ShortcutOverrides,
): Record<ActionId, string | null> {
  const bindings = Object.fromEntries(
    actionDefinitions.map((action) => [
      action.id,
      Object.hasOwn(overrides, action.id)
        ? overrides[action.id]
        : action.defaultShortcut,
    ]),
  ) as Record<ActionId, string | null>;
  // 新增默认键不得使已有合法配置失效，用户显式改绑仍按正常规则检查冲突。
  if (
    !Object.hasOwn(overrides, "toggleDetail") &&
    Object.entries(overrides).some(([id, value]) => {
      if (id === "toggleDetail" || !value) return false;
      try {
        return normalizeShortcut(value) === bindings.toggleDetail;
      } catch {
        return false;
      }
    })
  )
    bindings.toggleDetail = null;
  return bindings;
}

export function validateShortcuts(overrides: ShortcutOverrides): string[] {
  const errors: string[] = [];
  const effective = effectiveShortcuts(overrides);
  for (const id of Object.keys(overrides))
    if (!actionDefinitions.some((action) => action.id === id))
      errors.push(`Unknown action: ${id}`);
  const normalized = new Map<ActionId, string>();
  for (const action of actionDefinitions) {
    const value = effective[action.id];
    if (value === null) continue;
    try {
      if (typeof value !== "string")
        throw new Error("Enter a shortcut as text or disable it.");
      normalized.set(action.id, normalizeShortcut(value));
    } catch (error) {
      errors.push(`${action.title}: ${(error as Error).message}`);
    }
  }
  for (let i = 0; i < actionDefinitions.length; i++) {
    const a = actionDefinitions[i];
    for (const b of actionDefinitions.slice(i + 1)) {
      if (a.group !== "common" && b.group !== "common" && a.group !== b.group)
        continue;
      if (normalized.has(a.id) && normalized.get(a.id) === normalized.get(b.id))
        errors.push(`${a.title} and ${b.title} use the same shortcut.`);
    }
  }
  return errors;
}

export function serializeShortcuts(overrides: ShortcutOverrides) {
  const errors = validateShortcuts(overrides);
  if (errors.length) throw new Error(errors.join("\n"));
  const normalized = Object.fromEntries(
    Object.entries(overrides).map(([id, value]) => [
      id,
      value === null ? null : normalizeShortcut(value!),
    ]),
  );
  return JSON.stringify({ version: 1, overrides: normalized });
}

export function loadShortcutConfig(raw: string | undefined): {
  overrides: ShortcutOverrides;
  needsSave: boolean;
  error?: string;
} {
  if (raw === undefined) return { overrides: {}, needsSave: true };
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed?.version !== 1 ||
      !parsed.overrides ||
      typeof parsed.overrides !== "object" ||
      Array.isArray(parsed.overrides)
    )
      throw new Error("invalid");
    if (validateShortcuts(parsed.overrides).length) throw new Error("invalid");
    return {
      overrides: JSON.parse(serializeShortcuts(parsed.overrides)).overrides,
      needsSave: false,
    };
  } catch {
    return {
      overrides: {},
      needsSave: false,
      error:
        "Could not read shortcut settings. Custom shortcuts are disabled. Open Shortcut Settings to save or restore defaults.",
    };
  }
}

export function raycastShortcut(
  value: string | null | undefined,
): Keyboard.Shortcut | undefined {
  if (!value) return undefined;
  const parts = normalizeShortcut(value).split("+");
  return {
    key: parts.pop() as Keyboard.KeyEquivalent,
    modifiers: parts as Keyboard.KeyModifier[],
  };
}
