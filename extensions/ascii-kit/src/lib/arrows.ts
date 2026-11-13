// Big arrows, in three families. How well each renders depends on the font and line height,
// so the palette offers all three and says what to expect:
//
// - Heavy: straight line pieces only (━ ┃ ► ▼). Box-drawing lines join across rows in nearly
//   every monospace font, so these are the safe default.
// - Outline: drawn with ╱ ╲ diagonals. Reads as a classic outline arrow; in fonts whose
//   diagonals stop short of the cell corners, the rows show small breaks.
// - Solid: half blocks (▀ ▄ █), where one half block is roughly a square pixel, so the head can
//   taper at 45°. Solid where block glyphs fill the line height; striped where they don't.

const rows = (...r: string[]) => r.join("\n");

/** Mirrors a block arrow left-to-right. Half and full blocks are symmetric, so only order changes. */
export function mirror(arrow: string): string {
  const lines = arrow.split("\n");
  const width = Math.max(...lines.map((l) => [...l].length));
  return lines.map((l) => [...l.padEnd(width)].reverse().join("").trimEnd()).join("\n");
}

const SOLID_RIGHT_LARGE = rows(
  "            █▄",
  "▄▄▄▄▄▄▄▄▄▄▄▄███▄",
  "█████████████████",
  "▀▀▀▀▀▀▀▀▀▀▀▀███▀",
  "            █▀",
);
const SOLID_RIGHT = rows("        █▄", "▄▄▄▄▄▄▄▄███▄", "▀▀▀▀▀▀▀▀███▀", "        █▀");

export const SOLID_NOTE =
  "Solid where the font's block glyphs fill the whole line height; striped in fonts where they don't. Heavy arrows are the safe fallback.";

export const OUTLINE_NOTE =
  "Uses ╱ ╲ diagonals: in some fonts they stop short of the cell corners and the outline shows small breaks. Heavy arrows are the safe fallback.";

export const BIG_ARROWS = {
  heavyRight: "━━━━━━━━━►",
  heavyLeft: "◄━━━━━━━━━",
  heavyDown: rows("┃", "┃", "▼"),
  heavyUp: rows("▲", "┃", "┃"),
  doubleRight: "═════════►",
  dashedRight: "┅┅┅┅┅┅┅┅┅►",

  outlineRight: rows("     ┃╲", "━━━━━┛ ╲", "━━━━━┓ ╱", "     ┃╱"),
  outlineLeft: rows(" ╱┃", "╱ ┗━━━━━", "╲ ┏━━━━━", " ╲┃"),
  outlineDown: rows("  ┏━━┓", "  ┃  ┃", "━━┛  ┗━━", "╲      ╱", " ╲    ╱", "  ╲  ╱", "   ╲╱"),
  outlineUp: rows("   ╱╲", "  ╱  ╲", " ╱    ╲", "╱      ╲", "━━┓  ┏━━", "  ┃  ┃", "  ┗━━┛"),
  chevronRight: rows("━━━╲", "━━━╱"),
  chevronDown: rows(" ┃┃", "╲  ╱", " ╲╱"),

  solidRightLarge: SOLID_RIGHT_LARGE,
  solidRight: SOLID_RIGHT,
  solidRightSmall: rows("▄▄▄▄▄█▄", "▀▀▀▀▀█▀"),
  solidLeftLarge: mirror(SOLID_RIGHT_LARGE),
  solidLeft: mirror(SOLID_RIGHT),
  solidDown: rows("    ███", "    ███", "▀█████████▀", "  ▀█████▀", "    ▀█▀"),
  solidUp: rows("    ▄█▄", "  ▄█████▄", "▄█████████▄", "    ███", "    ███"),
};

/** A heavy arrow with a label centred above its shaft: the portable "becomes" joint. */
export function labelledArrow(label: string, direction: "right" | "left" = "right"): string {
  const shaft = direction === "right" ? BIG_ARROWS.heavyRight : BIG_ARROWS.heavyLeft;
  const width = Math.max([...shaft].length, [...label].length + 2);
  const line = direction === "right" ? "━".repeat(width - 1) + "►" : "◄" + "━".repeat(width - 1);
  const left = Math.floor((width - [...label].length) / 2);
  return rows(" ".repeat(left) + label, line);
}
