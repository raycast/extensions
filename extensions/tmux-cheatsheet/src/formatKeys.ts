const KEY_SYMBOLS: ReadonlyMap<string, string> = new Map([
  ["Up", "↑"],
  ["Down", "↓"],
  ["Left", "←"],
  ["Right", "→"],
  ["Space", "␣"],
  ["Enter", "↵"],
  ["Tab", "⇥"],
  ["Escape", "⎋"],
  ["BSpace", "⌫"],
]);

/**
 * Converts a tmux key notation into a display-friendly string with symbols.
 *
 * Examples:
 *   "C-a"   → "⌃A"
 *   "M-x"   → "⌥X"
 *   "C-M-z" → "⌃⌥Z"
 *   "Up"    → "↑"
 *   "d"     → "D"
 *   ","     → ","
 */
export function prettifyKey(key: string): string {
  // Check for direct symbol mapping first
  const symbol = KEY_SYMBOLS.get(key);
  if (symbol) return symbol;

  // Parse modifier prefixes: C- (Control), M- (Meta/Option), S- (Shift)
  let remaining = key;
  let prefix = "";

  while (remaining.length > 1) {
    if (remaining.startsWith("C-")) {
      prefix += "⌃";
      remaining = remaining.slice(2);
    } else if (remaining.startsWith("M-")) {
      prefix += "⌥";
      remaining = remaining.slice(2);
    } else if (remaining.startsWith("S-")) {
      prefix += "⇧";
      remaining = remaining.slice(2);
    } else {
      break;
    }
  }

  // After stripping modifiers, check for symbol mapping on the base key
  const baseSymbol = KEY_SYMBOLS.get(remaining);
  if (baseSymbol) return prefix + baseSymbol;

  // Uppercase single letters for readability; leave punctuation as-is
  const display = remaining.length === 1 && /[a-z]/.test(remaining) ? remaining.toUpperCase() : remaining;

  return prefix + display;
}
