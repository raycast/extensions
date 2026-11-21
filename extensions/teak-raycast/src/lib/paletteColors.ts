export const MAX_PALETTE_COLORS = 12;

const PALETTE_HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * `#RRGGBB` for a hex code someone typed (`#RGB` or `#RRGGBB`, with or
 * without the `#`), or null when it isn't one. Teak's API reads them the same
 * way.
 */
export const parsePaletteHex = (value: string): string | null => {
  const match = PALETTE_HEX.exec(value.trim());
  if (!match) {
    return null;
  }
  const digits = match[1] as string;
  const full =
    digits.length === 3
      ? digits
          .split("")
          .map((digit) => digit + digit)
          .join("")
      : digits;
  return `#${full.toUpperCase()}`;
};

export const parsePaletteHexList = (
  value: string | undefined,
): { hexes: string[]; invalid: string[] } => {
  const hexes: string[] = [];
  const invalid: string[] = [];
  for (const entry of (value ?? "").split(/[\s,]+/).filter(Boolean)) {
    const hex = parsePaletteHex(entry);
    if (!hex) {
      invalid.push(entry);
    } else if (!hexes.includes(hex)) {
      hexes.push(hex);
    }
  }
  return { hexes, invalid };
};

/**
 * A stored color's `#RRGGBB`, ignoring any alpha (`#FF000080` saved from text
 * is `#FF0000`), as Teak's API compares them.
 */
export const storedPaletteHex = (hex: string): string => {
  const digits = hex.trim().replace(/^#/, "");
  return (
    parsePaletteHex(digits.length === 8 ? digits.slice(0, 6) : digits) ?? hex
  );
};

export const paletteHexes = (
  colors: ReadonlyArray<{ hex: string }> | undefined,
): string[] =>
  Array.from(
    new Set((colors ?? []).map((color) => storedPaletteHex(color.hex))),
  );

export const explainPaletteEdit = (
  current: string[],
  edit: { add: string[]; invalid: string[]; remove: string[] },
): string | null => {
  if (edit.invalid.length > 0) {
    return `Not a hex code: ${edit.invalid.join(", ")}. Use one such as #FF5500.`;
  }
  const kept = current.filter((hex) => !edit.remove.includes(hex));
  const next = [...kept, ...edit.add.filter((hex) => !kept.includes(hex))];
  if (next.length === 0) {
    return "A palette needs at least one color.";
  }
  if (next.length > MAX_PALETTE_COLORS && next.length > current.length) {
    return `A palette holds up to ${MAX_PALETTE_COLORS} colors.`;
  }
  return null;
};
