// Platform detection + platform-aware shortcuts and display strings. The
// extension ships for macOS and Windows (manifest platforms), and three
// things vary by OS:
//
//   1. Feature availability. TTS shells out to macOS's `say` binary, so
//      the Speak actions render only when isMacOS (they are absent, not
//      broken, on Windows).
//   2. Shortcut BINDINGS that must fire on both platforms. Raycast does
//      NOT auto-map an "ambiguous" modifier (cmd / opt) across platforms:
//      a bare { modifiers: ["cmd"], key: "o" } shortcut is IGNORED on
//      Windows. Its hint still renders as Ctrl+O, so the key silently does
//      nothing there. crossShortcut emits the { macOS, Windows } platform-
//      object form (the shape @raycast/api requires for cross-platform
//      shortcuts) so the same action is bound on both. cmd → ctrl,
//      opt → alt; shift / ctrl are the same token on both.
//   3. Shortcut hints baked into DISPLAY TEXT. A shortcut written into a
//      plain string (the Quick Add "Last Added" banner, the duplicate-
//      entry hint) is not a real Action `shortcut`, so nothing renders it
//      per-OS; shortcutHint formats those with the same cmd → Ctrl /
//      opt → Alt translation crossShortcut uses, so Windows users see
//      "Ctrl+O" instead of a Command glyph their keyboard doesn't have.

import type { Keyboard } from "@raycast/api";

export const isMacOS = process.platform === "darwin";

type HintModifier = "cmd" | "shift" | "opt" | "ctrl";

const MAC_GLYPHS: Record<HintModifier, string> = {
  cmd: "⌘",
  shift: "⇧",
  opt: "⌥",
  ctrl: "⌃",
};

const WINDOWS_NAMES: Record<HintModifier, string> = {
  cmd: "Ctrl",
  shift: "Shift",
  opt: "Alt",
  ctrl: "Ctrl",
};

// Windows KeyModifier equivalents of the mac-style modifiers, for the
// actual binding (not just display). Keep this in lockstep with
// WINDOWS_NAMES above so a shortcut's hint and its real key agree.
const WINDOWS_MODIFIERS: Record<HintModifier, Keyboard.KeyModifier> = {
  cmd: "ctrl",
  shift: "shift",
  opt: "alt",
  ctrl: "ctrl",
};

export function shortcutHint(modifiers: HintModifier[], key: string): string {
  const upperKey = key.toUpperCase();
  if (isMacOS) {
    return modifiers.map((m) => MAC_GLYPHS[m]).join("") + upperKey;
  }
  return [...modifiers.map((m) => WINDOWS_NAMES[m]), upperKey].join("+");
}

// Build a cross-platform Keyboard.Shortcut from a mac-style spec. Every
// Action `shortcut` in this extension goes through here: passing a bare
// { modifiers: ["cmd"], key } would bind on macOS but silently no-op on
// Windows (see the header note). The { macOS, Windows } object form binds
// on both, translating cmd → ctrl and opt → alt for the Windows variant.
export function crossShortcut(
  modifiers: HintModifier[],
  key: Keyboard.KeyEquivalent,
): Keyboard.Shortcut {
  return {
    macOS: { modifiers, key },
    Windows: { modifiers: modifiers.map((m) => WINDOWS_MODIFIERS[m]), key },
  };
}
