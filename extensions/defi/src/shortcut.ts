const modifiers: Record<string, string> = { ctrl: "⌃", alt: "⌥", shift: "⇧", cmd: "⌘" };
const keys: Record<string, string> = {
  left: "←",
  right: "→",
  up: "↑",
  down: "↓",
  home: "↖",
  end: "↘",
  pageup: "⇞",
  pagedown: "⇟",
  comma: ",",
  period: ".",
  slash: "/",
  semicolon: ";",
  quote: "'",
  leftbracket: "[",
  rightbracket: "]",
  minus: "-",
  equal: "=",
  tab: "⇥",
};

// "mod-shift-comma" as macOS glyphs with Defi's default mod (ctrl+alt): "⌃⌥⇧,".
export function formatShortcut(shortcut: string): string {
  const parts = shortcut.split("-");
  const key = parts.pop() ?? "";
  const held = new Set(parts.flatMap((part) => (part === "mod" ? ["ctrl", "alt"] : [part])));
  const glyphs = ["ctrl", "alt", "shift", "cmd"].filter((name) => held.has(name)).map((name) => modifiers[name]);
  return glyphs.join("") + (keys[key] ?? key.toUpperCase());
}
