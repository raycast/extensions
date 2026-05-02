import { Color } from "@raycast/api";

export type FinderTagColorIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * Finder tag color index → Raycast Color.
 *
 * This is Apple's fixed Finder tag color-index contract. Do not reorder or
 * reinterpret these values: `_kMDItemUserTags` stores the numeric index, not
 * the display colour name.
 *
 * 0=none, 1=red, 2=orange, 3=yellow, 4=green, 5=blue, 6=purple, 7=gray
 */
export const FINDER_TAG_COLORS: Readonly<Record<FinderTagColorIndex, Color>> = Object.freeze({
  0: Color.PrimaryText, // none
  1: Color.Red,
  2: Color.Orange,
  3: Color.Yellow,
  4: Color.Green,
  5: Color.Blue,
  6: Color.Purple,
  7: Color.SecondaryText, // gray
});

/** Resolve a Finder tag color index to a Raycast Color. null/undefined → 0 (none). */
export function getFinderTagColor(colorIndex: number | null | undefined): Color {
  return isFinderTagColorIndex(colorIndex) ? FINDER_TAG_COLORS[colorIndex] : FINDER_TAG_COLORS[0];
}

function isFinderTagColorIndex(colorIndex: number | null | undefined): colorIndex is FinderTagColorIndex {
  return typeof colorIndex === "number" && Number.isInteger(colorIndex) && colorIndex >= 0 && colorIndex <= 7;
}

export const EMOJI = {
  folder: "📁",
  file: "📄",
} as const;
