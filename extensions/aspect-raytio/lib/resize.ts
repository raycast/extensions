export type Dimensions = {
  width: number;
  height: number;
};

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

export type ResizeResult = {
  id: "new-width" | "new-height";
  label: string;
  width: number;
  height: number;
  /** True when the computed side had to be rounded to fit the output precision. */
  rounded: boolean;
};

// Separator between width and height: "x", "X", "×" (and the Cyrillic "х" lookalike), optionally
// surrounded by spaces, or just whitespace.
const SEPARATOR = String.raw`(?:\s*[x×х]\s*|\s+)`;
const NUMBER = String.raw`[-+]?(?:\d+(?:\.\d*)?|\.\d+)`;
const DIMENSIONS_RE = new RegExp(`^(${NUMBER})${SEPARATOR}(${NUMBER})$`, "i");
const DIMENSIONS_WITH_SIZE_RE = new RegExp(`^(${NUMBER})${SEPARATOR}(${NUMBER})\\s+(\\S+)$`, "i");
const NUMBER_RE = new RegExp(`^${NUMBER}$`);

/** Max decimal places shown for results when any input has decimals. */
const MAX_DECIMALS = 2;

function decimalsOf(value: string): number {
  const fraction = value.split(".")[1];
  return fraction ? fraction.length : 0;
}

function parsePositive(raw: string, label: string): ParseResult<number> {
  const value = raw.trim();
  if (!NUMBER_RE.test(value)) {
    return { ok: false, error: `${label} must be a number, e.g. 1000 or 600.25` };
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return { ok: false, error: `${label} must be greater than zero` };
  }
  return { ok: true, value: number };
}

/** Parses a single positive size such as `1000` or `600.25`. */
export function parseSize(input: string): ParseResult<number> {
  return parsePositive(input, "New size");
}

function dimensionsFromParts(rawWidth: string, rawHeight: string): ParseResult<Dimensions> {
  const width = parsePositive(rawWidth, "Width");
  if (!width.ok) return width;
  const height = parsePositive(rawHeight, "Height");
  if (!height.ok) return height;
  return { ok: true, value: { width: width.value, height: height.value } };
}

/** Parses dimensions such as `1000x800`, `1000 × 800`, `1000X800` or `1000 800`. */
export function parseDimensions(input: string): ParseResult<Dimensions> {
  const match = input.trim().match(DIMENSIONS_RE);
  if (!match) {
    return { ok: false, error: "Use width and height, e.g. 1000x800, 1000 × 800 or 1000 800" };
  }
  return dimensionsFromParts(match[1], match[2]);
}

export type Query = {
  original: ParseResult<Dimensions>;
  /** Undefined when no new size was entered. */
  newSize?: ParseResult<number>;
};

/**
 * Resolves the original dimensions and new size from the command argument and the search bar.
 *
 * The search bar normally holds the new size (`1000`), but it can also override the original
 * dimensions (`1200x900`) or both at once (`1200x900 600`).
 */
export function parseQuery(originalArgument: string, searchText: string): Query {
  const search = searchText.trim();
  if (search === "") {
    return { original: parseDimensions(originalArgument) };
  }

  const withSize = search.match(DIMENSIONS_WITH_SIZE_RE);
  if (withSize) {
    return { original: dimensionsFromParts(withSize[1], withSize[2]), newSize: parseSize(withSize[3]) };
  }

  if (DIMENSIONS_RE.test(search)) {
    return { original: parseDimensions(search) };
  }

  return { original: parseDimensions(originalArgument), newSize: parseSize(search) };
}

function gcd(a: number, b: number): number {
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

/** Reduces dimensions to their simplest ratio. Decimals are scaled to integers first (16.5x9 → 11:6). */
export function reduceRatio({ width, height }: Dimensions): Dimensions {
  const decimals = Math.min(Math.max(decimalsOf(String(width)), decimalsOf(String(height))), 6);
  const scale = 10 ** decimals;
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  // Values too small to scale (e.g. 1e-7) can't be reduced meaningfully.
  if (w === 0 || h === 0) return { width, height };
  const divisor = gcd(w, h) || 1;
  return { width: w / divisor, height: h / divisor };
}

export function formatRatio(ratio: Dimensions): string {
  return `${ratio.width}:${ratio.height}`;
}

export function formatDimensions({ width, height }: Dimensions): string {
  return `${width}×${height}`;
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Computes both resize results for a new size, keeping the original aspect ratio:
 * the new size used as the width, and the new size used as the height.
 *
 * Results are whole numbers when every input is a whole number (pixels), otherwise both sides keep
 * up to two decimal places. The new size is rounded to the same precision first, and the other side
 * is computed from that rounded value so both sides stay consistent.
 */
export function resize(original: Dimensions, newSize: number): ResizeResult[] {
  const allIntegers = [original.width, original.height, newSize].every(Number.isInteger);
  const decimals = allIntegers ? 0 : MAX_DECIMALS;
  // Never round a positive side down to zero.
  const minimum = 10 ** -decimals;

  const size = roundTo(newSize, decimals) || minimum;
  const sizeRounded = size !== newSize;

  const exactHeight = (size * original.height) / original.width;
  const exactWidth = (size * original.width) / original.height;
  const height = roundTo(exactHeight, decimals) || minimum;
  const width = roundTo(exactWidth, decimals) || minimum;

  return [
    {
      id: "new-width",
      label: "New Width",
      width: size,
      height,
      rounded: sizeRounded || height !== exactHeight,
    },
    {
      id: "new-height",
      label: "New Height",
      width,
      height: size,
      rounded: sizeRounded || width !== exactWidth,
    },
  ];
}
