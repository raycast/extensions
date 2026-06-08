/**
 * Pure parsing of a user-editable shortcut combo string (e.g. "cmd+shift+m") into the pieces the
 * AppleScript dispatcher needs. No side effects, no automation — this is unit-tested decision logic.
 *
 * Supported modifier aliases (case-insensitive): cmd/command/⌘, shift/⇧, opt/option/alt/⌥,
 * ctrl/control/⌃. The key must be exactly one printable character (e.g. "m"). Combos with no
 * modifier, an empty/whitespace input, an unknown token, or a multi-character key are rejected.
 */

/** AppleScript modifier names, in a stable order, as used in `keystroke ... using {...}`. */
export type AppleScriptModifier = "command down" | "shift down" | "option down" | "control down";

export interface ParsedShortcut {
  /** The single character to type, lowercased (AppleScript `keystroke` is case-driven by shift). */
  readonly key: string;
  /** AppleScript modifier names in canonical order. */
  readonly modifiers: AppleScriptModifier[];
}

export type ParseShortcutResult =
  | { readonly ok: true; readonly shortcut: ParsedShortcut }
  | { readonly ok: false; readonly reason: string };

const MODIFIER_ALIASES: Record<string, AppleScriptModifier> = {
  cmd: "command down",
  command: "command down",
  "⌘": "command down",
  shift: "shift down",
  "⇧": "shift down",
  opt: "option down",
  option: "option down",
  alt: "option down",
  "⌥": "option down",
  ctrl: "control down",
  control: "control down",
  "⌃": "control down",
};

/** Canonical order so output is deterministic regardless of how the user typed the combo. */
const MODIFIER_ORDER: AppleScriptModifier[] = [
  "command down",
  "control down",
  "option down",
  "shift down",
];

export function parseShortcut(input: string | undefined | null): ParseShortcutResult {
  if (input == null) {
    return { ok: false, reason: "shortcut is empty" };
  }
  const tokens = input
    .split("+")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);

  if (tokens.length === 0) {
    return { ok: false, reason: "shortcut is empty" };
  }

  const modifiers = new Set<AppleScriptModifier>();
  let key: string | undefined;

  for (const token of tokens) {
    const modifier = MODIFIER_ALIASES[token];
    if (modifier) {
      modifiers.add(modifier);
      continue;
    }
    // Non-modifier token: it must be the key, and there must be exactly one.
    if (key !== undefined) {
      return { ok: false, reason: `unexpected extra key token "${token}"` };
    }
    if (token.length !== 1) {
      return { ok: false, reason: `key must be a single character, got "${token}"` };
    }
    key = token;
  }

  if (key === undefined) {
    return { ok: false, reason: "no key character in shortcut" };
  }
  if (modifiers.size === 0) {
    return { ok: false, reason: "shortcut needs at least one modifier (e.g. cmd+shift+m)" };
  }

  const ordered = MODIFIER_ORDER.filter((m) => modifiers.has(m));
  return { ok: true, shortcut: { key, modifiers: ordered } };
}
