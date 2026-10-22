/** Presentation only: recognize Obsidian's observed { modifiers, key } shortcut entries. */
export interface HotkeyBinding {
  modifiers: string[];
  key: string;
}

export function parseHotkeyBindings(value: unknown): HotkeyBinding[] | null {
  if (!Array.isArray(value)) return null;
  const bindings: HotkeyBinding[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const candidate = entry as Record<string, unknown>;
    if (
      !Array.isArray(candidate.modifiers) ||
      !candidate.modifiers.every((modifier) => typeof modifier === "string") ||
      typeof candidate.key !== "string"
    )
      return null;
    bindings.push({ modifiers: candidate.modifiers, key: candidate.key });
  }
  return bindings;
}

function modifierToken(modifier: string): string {
  switch (modifier.toLowerCase()) {
    case "mod":
    case "meta":
    case "cmd":
    case "command":
      return "⌘";
    case "ctrl":
    case "control":
      return "⌃";
    case "alt":
    case "option":
      return "⌥";
    case "shift":
      return "⇧";
    default:
      return modifier;
  }
}

function keyToken(key: string): string {
  switch (key.toLowerCase()) {
    case "arrowleft":
      return "←";
    case "arrowright":
      return "→";
    case "arrowup":
      return "↑";
    case "arrowdown":
      return "↓";
    case "enter":
    case "return":
      return "↵";
    case "backspace":
      return "⌫";
    case "escape":
      return "Esc";
    case "space":
      return "Space";
    case "tab":
      return "⇥";
    default:
      return key.length === 1 ? key.toUpperCase() : key;
  }
}

export function hotkeyTokens(binding: HotkeyBinding): string[] {
  return [...binding.modifiers.map(modifierToken), keyToken(binding.key)];
}

export function hotkeyCommandTitle(id: string): string {
  const command = id.slice(id.lastIndexOf(":") + 1);
  return (
    command
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[-_.]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
      .trim() || id
  );
}

export function hotkeySummary(bindings: HotkeyBinding[] | null | undefined, present: boolean): string {
  if (!present) return "Not set";
  if (!bindings) return "Shortcut format unavailable";
  if (bindings.length === 0) return "No shortcuts";
  const summary = bindings
    .slice(0, 2)
    .map((binding) => hotkeyTokens(binding).join(" + "))
    .join(" · ");
  return bindings.length > 2 ? `${summary} · +${bindings.length - 2} more` : summary;
}
