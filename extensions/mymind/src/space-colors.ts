/**
 * The fixed color palette mymind supports for spaces. The API rejects any color
 * outside this set, so both the UI dropdown and the AI tools resolve colors
 * against this list. Keep the titles and hex values in sync with mymind.
 */
export const SPACE_COLOR_OPTIONS = [
  { title: "Red", value: "#ef3e4a" },
  { title: "Pink", value: "#ff8fa4" },
  { title: "Mauve", value: "#cba0aa" },
  { title: "Peach", value: "#ffdcd0" },
  { title: "Coral", value: "#ff9770" },
  { title: "Orange", value: "#f96" },
  { title: "Yellow", value: "#fdf06f" },
  { title: "Lime", value: "#cdff06" },
  { title: "Mint", value: "#75ffc0" },
  { title: "Emerald", value: "#17c37b" },
  { title: "Teal", value: "#06d6a0" },
  { title: "Ice", value: "#96cbd1" },
  { title: "Sky", value: "#70d6ff" },
  { title: "Cyan", value: "#19aad1" },
  { title: "Blue", value: "#166ff4" },
  { title: "Iris", value: "#b388eb" },
  { title: "Purple", value: "#7a30cf" },
  { title: "Lavender", value: "#bfb5d7" },
  { title: "Silver", value: "#c0c2ce" },
  { title: "Black", value: "#000" },
] as const;

/** The palette color names, in display order (e.g. "Red", "Pink", ...). */
export const SPACE_COLOR_NAMES = SPACE_COLOR_OPTIONS.map((option) => option.title);

/** Lowercased, trimmed color string for consistent hex comparisons. */
export function normalizeColor(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Resolve a user-provided color to a canonical palette hex value.
 *
 * Accepts a palette color NAME (case-insensitive, e.g. "teal") or a hex string
 * matching one of the palette values. Returns the canonical palette hex when it
 * resolves.
 *
 * Returns `undefined` in two cases: when `input` is empty/whitespace (meaning
 * "no color") and when a value was provided but doesn't match the palette.
 * Callers can distinguish the two by checking whether a non-empty value was
 * passed in — a non-empty input that resolves to `undefined` is unsupported.
 */
export function resolveSpaceColor(input?: string): string | undefined {
  const trimmed = input?.trim();

  if (!trimmed) {
    return undefined;
  }

  const byName = SPACE_COLOR_OPTIONS.find((option) => option.title.toLowerCase() === trimmed.toLowerCase());
  if (byName) {
    return byName.value;
  }

  const normalized = normalizeColor(trimmed);
  return SPACE_COLOR_OPTIONS.find((option) => normalizeColor(option.value) === normalized)?.value;
}

/**
 * Pick a palette color hex for a space when the user didn't specify a supported
 * one. When a `seed` (typically the space name) is provided, the choice is
 * derived from a stable hash of the seed so the same name always maps to the
 * same color while still spreading names across the palette. Without a seed a
 * random palette color is returned. Always returns a valid palette hex.
 */
export function pickSpaceColor(seed?: string): string {
  const trimmed = seed?.trim();

  if (!trimmed) {
    return SPACE_COLOR_OPTIONS[Math.floor(Math.random() * SPACE_COLOR_OPTIONS.length)].value;
  }

  let hash = 0;
  for (let index = 0; index < trimmed.length; index += 1) {
    hash = (hash * 31 + trimmed.charCodeAt(index)) >>> 0;
  }

  return SPACE_COLOR_OPTIONS[hash % SPACE_COLOR_OPTIONS.length].value;
}

/** Human-readable palette name for a palette hex value, if it belongs to the palette. */
export function getSpaceColorName(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = normalizeColor(value);
  return SPACE_COLOR_OPTIONS.find((option) => normalizeColor(option.value) === normalized)?.title;
}
