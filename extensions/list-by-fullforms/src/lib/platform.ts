// Platform detection + platform-aware display strings. The extension
// ships for macOS and Windows (manifest platforms), and two things vary
// by OS:
//
//   1. Feature availability. TTS shells out to macOS's `say` binary, so
//      the Speak actions render only when isMacOS (they are absent, not
//      broken, on Windows).
//   2. Shortcut hints baked into DISPLAY TEXT. Raycast auto-translates
//      an Action's `shortcut` modifiers per-OS (⌘ on macOS renders as
//      Ctrl on Windows), but a shortcut written into a plain string (the
//      Quick Add "Last Added" banner, the duplicate-entry hint) does NOT
//      auto-translate; shortcutHint formats those per-platform so
//      Windows users see "Ctrl+O" instead of a Command glyph their
//      keyboard doesn't have.

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

export function shortcutHint(modifiers: HintModifier[], key: string): string {
  const upperKey = key.toUpperCase();
  if (isMacOS) {
    return modifiers.map((m) => MAC_GLYPHS[m]).join("") + upperKey;
  }
  return [...modifiers.map((m) => WINDOWS_NAMES[m]), upperKey].join("+");
}
