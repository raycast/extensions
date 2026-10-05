const SYMBOLS: Record<string, string> = {
  ctrl: "⌃",
  control: "⌃",
  cmd: "⌘",
  command: "⌘",
  alt: "⌥",
  option: "⌥",
  shift: "⇧",
  meta: "⌘",
  esc: "⎋",
  enter: "⏎",
  tab: "⇥",
  space: "␣",
  pgup: "PgUp",
  pgdown: "PgDn",
  home: "Home",
  end: "End",
};

export function formatShortcutForDisplay(shortcut: string): string {
  let display = shortcut;
  display = display.replace(/`+/g, "");
  display = display.replace(/<br\s*\/?>/gi, " ");

  display = display.replace(
    /<c-([^>]+)>/gi,
    (_, key: string) => `${SYMBOLS.ctrl} ${normalizeKey(key)}`,
  );
  display = display.replace(
    /<a-([^>]+)>/gi,
    (_, key: string) => `${SYMBOLS.alt} ${normalizeKey(key)}`,
  );
  display = display.replace(
    /<s-([^>]+)>/gi,
    (_, key: string) => `${SYMBOLS.shift} ${normalizeKey(key)}`,
  );
  display = display.replace(/<([^>]+)>/g, (_, key: string) => formatToken(key));

  // Collapse duplicated spaces and add spacing around plus if present.
  display = display
    .replace(/\s*\+\s*/g, " + ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return display;
}

export function normalizeShortcut(shortcut: string): string {
  let normalized = shortcut.toLowerCase();
  normalized = normalized.replace(/`+/g, "");
  normalized = normalized.replace(/<br\s*\/?>/gi, " ");
  normalized = normalized.replace(/<c-([^>]+)>/gi, "ctrl+$1");
  normalized = normalized.replace(/<a-([^>]+)>/gi, "alt+$1");
  normalized = normalized.replace(/<s-([^>]+)>/gi, "shift+$1");
  normalized = normalized.replace(/<([^>]+)>/g, "$1");
  normalized = normalized.replace(/\s+/g, " ").trim();
  return normalized;
}

function formatToken(raw: string): string {
  const token = raw.toLowerCase();
  const symbol = SYMBOLS[token];
  if (symbol) return symbol;
  return normalizeKey(raw);
}

function normalizeKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length === 1) return trimmed.toUpperCase();
  return trimmed;
}
