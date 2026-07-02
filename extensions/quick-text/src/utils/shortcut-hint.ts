import type { Keyboard } from "@raycast/api";

// OS-aware, human-readable label for a keyboard shortcut (e.g. "⌘T" / "Ctrl T").
const isWin = process.platform === "win32";

const MOD: Record<string, string> = {
  cmd: isWin ? "Ctrl" : "⌘",
  ctrl: isWin ? "Ctrl" : "⌃",
  opt: isWin ? "Alt" : "⌥",
  shift: isWin ? "Shift" : "⇧",
};

export function shortcutHint(shortcut: Keyboard.Shortcut): string {
  const sc =
    "macOS" in shortcut
      ? isWin
        ? (shortcut.Windows ?? shortcut.macOS)
        : shortcut.macOS
      : shortcut;
  const parts = [...sc.modifiers.map((m) => MOD[m] ?? m), sc.key.toUpperCase()];
  return isWin ? parts.join(" ") : parts.join("");
}

// The Reload Selection action uses Keyboard.Shortcut.Common.Refresh (⌘R / Ctrl R).
export const RELOAD_HINT = isWin ? "Ctrl R" : "⌘R";
