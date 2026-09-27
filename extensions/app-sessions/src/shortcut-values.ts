export const NO_SHORTCUT = "__none__";

export function normalizeShortcutValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    return normalizeString(value);
  }

  if (!value || typeof value !== "object") {
    return undefined;
  }

  const option = value as { value?: unknown; name?: unknown; title?: unknown };
  return (
    normalizeShortcutValue(option.title) ?? normalizeShortcutValue(option.name) ?? normalizeShortcutValue(option.value)
  );
}

function normalizeString(value: string): string | undefined {
  const shortcut = value.trim();
  return shortcut && shortcut !== NO_SHORTCUT ? shortcut : undefined;
}
