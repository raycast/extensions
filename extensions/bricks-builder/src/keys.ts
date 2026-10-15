import { Key, Modifier, Shortcut } from "./shortcuts";

export type KeyStyle = "mac" | "windows";

const MAC_MODIFIERS: Record<Modifier, string> = { alt: "⌥", shift: "⇧", mod: "⌘" };
const WINDOWS_MODIFIERS: Record<Modifier, string> = { mod: "Ctrl", shift: "Shift", alt: "Alt" };

// Apple orders modifiers ⌃⌥⇧⌘; Windows conventionally writes Ctrl+Shift+Alt.
const MAC_ORDER: Modifier[] = ["alt", "shift", "mod"];
const WINDOWS_ORDER: Modifier[] = ["mod", "shift", "alt"];

const SPECIAL_LABELS: Record<Extract<Key, { type: "special" }>["value"], { mac: string; windows: string }> = {
  up: { mac: "↑", windows: "↑" },
  down: { mac: "↓", windows: "↓" },
  left: { mac: "←", windows: "←" },
  right: { mac: "→", windows: "→" },
  delete: { mac: "⌫", windows: "Delete" },
  enter: { mac: "↩", windows: "Enter" },
  esc: { mac: "⎋", windows: "Esc" },
};

// macOS virtual key codes for keys AppleScript can't send with `keystroke`.
const MAC_KEY_CODES: Record<Extract<Key, { type: "special" }>["value"], number> = {
  up: 126,
  down: 125,
  left: 123,
  right: 124,
  delete: 51,
  enter: 36,
  esc: 53,
};

function formatKey(key: Key, style: KeyStyle): string {
  switch (key.type) {
    case "char":
      return key.value.toUpperCase();
    case "special":
      return SPECIAL_LABELS[key.value][style];
    case "label":
      return key.value;
  }
}

export function formatShortcut(shortcut: Shortcut, style: KeyStyle): string {
  if (style === "mac") {
    const mods = MAC_ORDER.filter((m) => shortcut.modifiers.includes(m)).map((m) => MAC_MODIFIERS[m]);
    const key = shortcut.key ? formatKey(shortcut.key, style) : "";
    // Word labels ("Hold", "Number") read better spaced out from the symbols.
    const separator = shortcut.key?.type === "label" && mods.length > 0 ? " " : "";
    return mods.join("") + separator + key;
  }
  const parts = WINDOWS_ORDER.filter((m) => shortcut.modifiers.includes(m)).map((m) => WINDOWS_MODIFIERS[m]);
  if (shortcut.key) parts.push(formatKey(shortcut.key, style));
  return parts.join(" + ");
}

/** Whether the shortcut is a single key combination that can be pressed for the user. */
export function isPressable(shortcut: Shortcut): boolean {
  return shortcut.key !== undefined && shortcut.key.type !== "label";
}

/** AppleScript that presses the shortcut in the frontmost app via System Events. */
export function toAppleScript(shortcut: Shortcut): string {
  const key = shortcut.key;
  if (!key || key.type === "label") {
    throw new Error(`"${shortcut.title}" can't be pressed as a single key combination`);
  }

  const using = shortcut.modifiers.map((m) =>
    m === "mod" ? "command down" : m === "shift" ? "shift down" : "option down",
  );
  const usingClause = using.length > 0 ? ` using {${using.join(", ")}}` : "";
  const press =
    key.type === "char"
      ? `keystroke "${key.value.replace(/["\\]/g, "\\$&")}"${usingClause}`
      : `key code ${MAC_KEY_CODES[key.value]}${usingClause}`;

  return `
    delay 0.2
    tell application "System Events"
      ${press}
      return name of first application process whose frontmost is true
    end tell
  `;
}
