/**
 * Turns AeroSpace's raw binding strings (`ctrl-alt-cmd-l`) into the glyph form a
 * Mac user actually reads (`⌃ ⌥ ⌘ L`).
 *
 * Two deliberate choices:
 *
 * 1. Modifiers are re-ordered into macOS canonical order (⌃ ⌥ ⇧ ⌘) regardless of
 *    how they were written in the config, so `alt-ctrl-a` and `ctrl-alt-a` render
 *    identically. This matches every menu bar and Keyboard Shortcuts pane on macOS.
 *
 * 2. Glyphs are joined with U+2009 THIN SPACE, not rendered flush. Stacked modifier
 *    symbols (⌃⌥⌘) collide into an unreadable smear at list-row size; a thin space
 *    separates them without looking like separate keys the way a full space would.
 */

/** U+2009 THIN SPACE — narrower than a word space, wide enough to stop glyph collision. */
const THIN = " ";

/** macOS canonical modifier order. Control, Option, Shift, Command. */
const MODIFIER_ORDER = ["ctrl", "alt", "shift", "cmd"] as const;

const MODIFIER_GLYPH: Record<string, string> = {
  ctrl: "⌃",
  alt: "⌥",
  shift: "⇧",
  cmd: "⌘",
};

/**
 * Named keys → glyph. AeroSpace spells these out in the toml; macOS draws them as
 * symbols. Anything not listed falls through to an uppercased literal, which is
 * correct for letters and digits.
 */
const KEY_GLYPH: Record<string, string> = {
  left: "←",
  down: "↓",
  up: "↑",
  right: "→",
  leftsquarebracket: "[",
  rightsquarebracket: "]",
  minus: "−",
  equal: "=",
  slash: "/",
  backslash: "\\",
  comma: ",",
  period: ".",
  semicolon: ";",
  quote: "'",
  backtick: "`",
  enter: "↩",
  space: "␣",
  tab: "⇥",
  backspace: "⌫",
  delete: "⌦",
  esc: "⎋",
  escape: "⎋",
  home: "↖",
  end: "↘",
  pageup: "⇞",
  pagedown: "⇟",
};

export interface ParsedKey {
  /** Display form, thin-spaced: `⌃ ⌥ ⌘ L` */
  display: string;
  /** Modifier glyphs in canonical order. */
  modifiers: string[];
  /** The non-modifier key glyph. */
  key: string;
  /** The original toml string, e.g. `ctrl-alt-cmd-l`. */
  raw: string;
}

/** `ctrl-alt-cmd-l` → { display: "⌃ ⌥ ⌘ L", ... } */
export function parseKey(raw: string): ParsedKey {
  const parts = raw.split("-").filter(Boolean);

  const present = new Set<string>();
  const rest: string[] = [];
  for (const part of parts) {
    const lower = part.toLowerCase();
    if ((MODIFIER_ORDER as readonly string[]).includes(lower)) present.add(lower);
    else rest.push(part);
  }

  const modifiers = MODIFIER_ORDER.filter((m) => present.has(m)).map((m) => MODIFIER_GLYPH[m]);

  // AeroSpace spells punctuation out as words (`minus`, `leftSquareBracket`), so the
  // "-" separator is never ambiguous and whatever survives here is the key name.
  const key = glyphForKey(rest.join("-"));

  return {
    display: [...modifiers, key].filter(Boolean).join(THIN),
    modifiers,
    key,
    raw,
  };
}

function glyphForKey(name: string): string {
  if (!name) return "";
  const mapped = KEY_GLYPH[name.toLowerCase()];
  if (mapped) return mapped;
  if (name.length === 1) return name.toUpperCase();
  // Function keys are written f1-f20 in the config but read as F1-F20 on a keyboard.
  if (/^f\d{1,2}$/i.test(name)) return name.toUpperCase();
  // Anything else AeroSpace spells in camelCase (keypadPlus, sectionSign) becomes
  // spaced words rather than being printed as the raw identifier.
  return name.replace(/([a-z])([A-Z0-9])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
}

/** Just the display string, for when the parts aren't needed. */
export function keyDisplay(raw: string): string {
  return parseKey(raw).display;
}

/**
 * Search terms for a binding. Raycast filters on `keywords`, and the thin spaces in
 * the display form would otherwise stop `ctrlaltcmdl` or `⌃⌥⌘L` from matching — so
 * emit the unspaced variants alongside the raw toml spelling.
 */
export function keySearchTerms(raw: string): string[] {
  const parsed = parseKey(raw);
  return [
    raw, // ctrl-alt-cmd-l
    raw.replace(/-/g, ""), // ctrlaltcmdl
    parsed.display, // ⌃ ⌥ ⌘ L
    parsed.display.split(THIN).join(""), // ⌃⌥⌘L
    parsed.key, // L
  ].filter(Boolean);
}
