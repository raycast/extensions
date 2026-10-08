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
    throw new Error("按键仅支持字母、数字或 enter。");
  if (
    !parts.length ||
    new Set(parts).size !== parts.length ||
    parts.some(
      (part) => !modifiers.includes(part as (typeof modifiers)[number]),
    )
  )
    throw new Error("请使用 cmd、ctrl、opt、shift 组合，且不要重复修饰键。");
  if (parts.every((part) => part === "shift") && key !== "return")
    throw new Error("请保留普通文字输入，加入 cmd、ctrl 或 opt。");
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
    throw new Error("该快捷键由 Raycast 或搜索输入使用，请选择其他组合。");
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
      errors.push(`未知动作：${id}`);
  const normalized = new Map<ActionId, string>();
  for (const action of actionDefinitions) {
    const value = effective[action.id];
    if (value === null) continue;
    try {
      if (typeof value !== "string")
        throw new Error("快捷键必须为文字或停用状态。");
      normalized.set(action.id, normalizeShortcut(value));
    } catch (error) {
      errors.push(`${action.title}：${(error as Error).message}`);
    }
  }
  for (let i = 0; i < actionDefinitions.length; i++) {
    const a = actionDefinitions[i];
    for (const b of actionDefinitions.slice(i + 1)) {
      if (a.group !== "common" && b.group !== "common" && a.group !== b.group)
        continue;
      if (normalized.has(a.id) && normalized.get(a.id) === normalized.get(b.id))
        errors.push(`${a.title}与${b.title}的快捷键冲突。`);
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

export function loadShortcutConfig(
  raw: string | undefined,
  legacy = "cmd-shift",
): { overrides: ShortcutOverrides; needsSave: boolean; error?: string } {
  if (raw === undefined) {
    const overrides: ShortcutOverrides = {};
    if (legacy === "ctrl-shift" || legacy === "none")
      for (const [index, scope] of [
        "all",
        "tab",
        "bookmark",
        "history",
      ].entries())
        overrides[`source.${scope}` as ActionId] =
          legacy === "none" ? null : `ctrl+shift+${index}`;
    return { overrides, needsSave: true };
  }
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
        "快捷键配置无法读取，已暂停自定义快捷键。请打开“快捷键设置”保存或恢复默认。",
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
