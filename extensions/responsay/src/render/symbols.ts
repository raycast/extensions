// All glyphs are width-1 in common monospace fonts. If Raycast renders any as
// width-2 (misaligned during smoke test), swap that constant to an ASCII fallback.
export const SYM = {
  STRESS: "●",
  WEAK: "·",
  RISE: "↗",
  FALL: "↘",
  FALL_RISE: "↘↗",
  RISE_FALL: "↗↘",
  LEVEL: "→",
  GROUP: "‖",
  SYLLABLE_DOT: "·",
  LINK: "‿",
} as const;

import type { Tone } from "../types";
export function toneArrow(tone: Tone): string {
  switch (tone) {
    case "rise":
      return SYM.RISE;
    case "fall":
      return SYM.FALL;
    case "fall-rise":
      return SYM.FALL_RISE;
    case "rise-fall":
      return SYM.RISE_FALL;
    case "level":
      return SYM.LEVEL;
  }
}
