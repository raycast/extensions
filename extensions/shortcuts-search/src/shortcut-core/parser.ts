// Generated from shared/shortcuts-core; run scripts/sync-shortcuts-core.mjs --write.
import type { Chord, ModifierToken } from "./types";
const aliases: Record<string, ModifierToken> = {
  ctrl: "ctrl",
  shift: "shift",
  opt: "opt",
  alt: "opt",
  cmd: "cmd",
  win: "win",
};
export function splitChord(chord: string): string[] {
  if (chord === "+") return ["+"];
  if (chord.endsWith("++")) return [...chord.slice(0, -2).split("+"), "+"];
  return chord.split("+");
}
export function parseKey(key: string | undefined, hasKey?: (base: string) => boolean): Chord[] {
  if (key === undefined) return [];
  if (!key.trim()) throw new Error("Shortcut key is empty");
  return key
    .trim()
    .split(/\s+/)
    .map((chord) => {
      const tokens = splitChord(chord);
      const base = tokens.pop()!;
      if (!base || (hasKey && !hasKey(base))) throw new Error(`Unknown base key: ${base}`);
      const modifiers = tokens.map((token) => {
        const modifier = aliases[token];
        if (!modifier) throw new Error(`Unknown modifier: ${token}`);
        return modifier;
      });
      if (new Set(modifiers).size !== modifiers.length) throw new Error(`Repeated modifier: ${chord}`);
      return { base, modifiers };
    });
}
