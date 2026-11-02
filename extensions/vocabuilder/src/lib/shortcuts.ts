import { Keyboard } from "@raycast/api";

// Every chord stays anchored on cmd. Bare opt+<letter> is macOS's compose layer
// (Polish Pro opt+o -> ó, US opt+e -> dead-key acute), and all three commands are
// Lists whose search bar holds focus while the user types foreign words.
export const SHORTCUTS = {
  toggleLanguages: { modifiers: ["cmd", "shift"], key: "t" },
  openHistory: { modifiers: ["cmd", "shift"], key: "h" },
  copyTranslation: { modifiers: ["cmd"], key: "c" },

  // TODO: two free letters from ⌘⇧B E F G I J L M N R U V X Y Z.
  // ⌘⇧J is spoken for below; ⌘⇧K/W/P are avoided as reserved siblings.
  pronounceWord: { modifiers: ["cmd", "shift"], key: "l" },
  pronounceTranslation: { modifiers: ["cmd", "shift"], key: "r" },

  exportJson: { modifiers: ["cmd", "shift"], key: "j" },
  exportAnki: { modifiers: ["cmd", "shift"], key: "a" },
  exportQuizlet: { modifiers: ["cmd", "shift"], key: "q" },

  // TODO: adopt Keyboard.Shortcut.Common.Remove / .RemoveAll (⌃D / ⌃⇧D) instead?
  deleteEntry: { modifiers: ["cmd"], key: "d" },
  clearAllHistory: { modifiers: ["cmd", "shift"], key: "d" },

  rateAgain: { modifiers: [], key: "1" },
  rateEasy: { modifiers: [], key: "2" },
} satisfies Record<string, Keyboard.Shortcut>;

// Keyboard.Shortcut also admits a per-platform { Windows, macOS } object. The chord
// invariants and the rail's formatter need the flat shape every entry above uses.
type Chord = { modifiers: Keyboard.KeyModifier[]; key: Keyboard.KeyEquivalent };

// Apple's canonical order, not the order the modifiers array happens to be written
// in — otherwise reordering an array would silently restyle the rendered chord.
const MODIFIER_SYMBOLS: ReadonlyArray<[Keyboard.KeyModifier, string]> = [
  ["ctrl", "⌃"],
  ["opt", "⌥"],
  ["shift", "⇧"],
  ["cmd", "⌘"],
];

export function formatShortcut(shortcut: Chord): string {
  const symbols = MODIFIER_SYMBOLS.filter(([modifier]) => shortcut.modifiers.includes(modifier)).map(
    ([, symbol]) => symbol,
  );
  return `${symbols.join("")}${shortcut.key.toUpperCase()}`;
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  const chordId = (chord: Chord) => `${[...chord.modifiers].sort().join("+")}|${chord.key}`;

  // Keyboard.Shortcut.Common, both platform variants, as of @raycast/api 1.104.
  // Copied because the values are not reachable at runtime (the test alias replaces
  // @raycast/api with a mock) and because @raycast/prefer-common-shortcut only
  // inspects inline JSX objects — it stops seeing a chord the moment it moves here.
  const COMMON_CHORDS: Chord[] = [
    { modifiers: ["cmd", "shift"], key: "c" }, // Copy, CopyDeeplink
    { modifiers: ["ctrl", "shift"], key: "c" },
    { modifiers: ["cmd", "opt"], key: "c" }, // CopyName
    { modifiers: ["ctrl", "alt"], key: "c" },
    { modifiers: ["cmd", "ctrl"], key: "c" }, // CopyPath
    { modifiers: ["alt", "shift"], key: "c" },
    { modifiers: ["cmd"], key: "s" }, // Save
    { modifiers: ["ctrl"], key: "s" },
    { modifiers: ["cmd", "shift"], key: "s" }, // Duplicate
    { modifiers: ["ctrl", "shift"], key: "s" },
    { modifiers: ["cmd"], key: "e" }, // Edit
    { modifiers: ["ctrl"], key: "e" },
    { modifiers: ["cmd", "shift"], key: "arrowDown" }, // MoveDown
    { modifiers: ["ctrl", "shift"], key: "arrowDown" },
    { modifiers: ["cmd", "shift"], key: "arrowUp" }, // MoveUp
    { modifiers: ["ctrl", "shift"], key: "arrowUp" },
    { modifiers: ["cmd"], key: "n" }, // New
    { modifiers: ["ctrl"], key: "n" },
    { modifiers: ["cmd"], key: "o" }, // Open
    { modifiers: ["ctrl"], key: "o" },
    { modifiers: ["cmd", "shift"], key: "o" }, // OpenWith
    { modifiers: ["ctrl", "shift"], key: "o" },
    { modifiers: ["cmd"], key: "." }, // Pin
    { modifiers: ["ctrl"], key: "." },
    { modifiers: ["cmd"], key: "r" }, // Refresh
    { modifiers: ["ctrl"], key: "r" },
    { modifiers: ["ctrl"], key: "d" }, // Remove
    { modifiers: ["ctrl", "shift"], key: "d" }, // RemoveAll
    { modifiers: ["cmd"], key: "y" }, // ToggleQuickLook
    { modifiers: ["ctrl"], key: "y" },
  ];

  const entries = Object.entries(SHORTCUTS) as [string, Chord][];

  describe("SHORTCUTS", () => {
    it("binds no action to a Keyboard.Shortcut.Common chord", () => {
      const common = new Set(COMMON_CHORDS.map(chordId));
      const collisions = entries.filter(([, chord]) => common.has(chordId(chord))).map(([name]) => name);
      expect(collisions).toEqual([]);
    });

    it("anchors every modified chord on cmd, keeping opt off the compose layer", () => {
      const unanchored = entries
        .filter(([, chord]) => chord.modifiers.length > 0 && !chord.modifiers.includes("cmd"))
        .map(([name]) => name);
      expect(unanchored).toEqual([]);
    });

    it("gives each action its own chord", () => {
      const ids = entries.map(([, chord]) => chordId(chord));
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("formatShortcut", () => {
    it("renders modifiers in ⌃⌥⇧⌘ order however the array is written", () => {
      expect(formatShortcut({ modifiers: ["shift", "cmd"], key: "s" })).toBe("⇧⌘S");
      expect(formatShortcut({ modifiers: ["cmd", "shift"], key: "s" })).toBe("⇧⌘S");
      expect(formatShortcut({ modifiers: ["cmd", "opt", "ctrl", "shift"], key: "s" })).toBe("⌃⌥⇧⌘S");
    });

    it("renders the pronounce chords the rail advertises", () => {
      expect(formatShortcut(SHORTCUTS.pronounceWord)).toBe("⇧⌘L");
      expect(formatShortcut(SHORTCUTS.pronounceTranslation)).toBe("⇧⌘R");
    });

    it("renders an unmodified chord as the bare key", () => {
      expect(formatShortcut(SHORTCUTS.rateAgain)).toBe("1");
    });
  });
}
