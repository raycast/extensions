/** Tokens treated as monochrome ink/paper (safe to invert for dark mode). */
const MONOCHROME_NAMED = new Set(["black", "white", "currentcolor"]);

/** Values that are not paint colors (geometry, masks, etc.). */
const IGNORED_PAINT = new Set(["none", "transparent", "inherit", "initial", "unset"]);

const PAINT_ATTR_PATTERN = /(?:fill|stroke)\s*=\s*["']([^"']+)["']/gi;
const PAINT_CSS_PATTERN = /(?:fill|stroke)\s*:\s*([^;}"'\s]+)/gi;

/**
 * Returns true when every paint color in the SVG is monochrome (black/white/currentColor)
 * or a non-paint value (none, url(...), etc.). Brand-colored icons return false.
 *
 * Paint-less SVGs are treated as monochrome: SVG's default fill is black, so they render as
 * black ink in light mode and need a dark-mode invert (inject white fill on the root).
 */
export function isMonochromeSvg(svg: string): boolean {
  const paints = collectPaintValues(svg);
  // Implicit black fill (no fill/stroke attributes) is monochrome ink.
  if (paints.length === 0) {
    return true;
  }

  let hasInk = false;
  for (const paint of paints) {
    if (isIgnoredPaint(paint)) {
      continue;
    }
    if (!isMonochromePaint(paint)) {
      return false;
    }
    hasInk = true;
  }

  // Only ignored paints (none/transparent/url(...)) — not solid monochrome ink.
  return hasInk;
}

/**
 * Inverts monochrome black/white/currentColor paints for dark mode.
 * Returns null when the SVG is not monochrome.
 */
export function invertMonochromeSvg(svg: string): string | null {
  if (!isMonochromeSvg(svg)) {
    return null;
  }

  // Paint-less icons rely on the SVG default black fill; inject white for dark mode.
  if (collectPaintValues(svg).length === 0) {
    return injectRootFill(svg, "#fff");
  }

  // Placeholder swap so black↔white does not thrash.
  return svg
    .replace(/currentColor/gi, "__MONO_INK__")
    .replace(/#000000\b/gi, "__MONO_INK__")
    .replace(/#000\b/gi, "__MONO_INK__")
    .replace(/\bblack\b/gi, "__MONO_INK__")
    .replace(/#ffffff\b/gi, "__MONO_PAPER__")
    .replace(/#fff\b/gi, "__MONO_PAPER__")
    .replace(/\bwhite\b/gi, "__MONO_PAPER__")
    .replace(/__MONO_INK__/g, "#fff")
    .replace(/__MONO_PAPER__/g, "#000");
}

/** Set or replace fill on the root <svg> element (used for paint-less monochrome icons). */
function injectRootFill(svg: string, fill: string): string {
  return svg.replace(/<svg\b([^>]*)>/i, (_match, attrs: string) => {
    if (/\bfill\s*=/i.test(attrs)) {
      return `<svg${attrs.replace(/\bfill\s*=\s*(["'][^"']*["']|[^\s>]+)/i, `fill="${fill}"`)}>`;
    }
    return `<svg fill="${fill}"${attrs}>`;
  });
}

export function scaleSvgViewBox(svg: string, scale: number): string {
  if (scale === 1) {
    return svg;
  }

  const viewBoxPattern = /viewBox="([-0-9.]+)\s+([-0-9.]+)\s+([0-9.]+)\s+([0-9.]+)"/i;
  const match = viewBoxPattern.exec(svg);
  if (!match) {
    return svg;
  }

  const [, x, y, width, height] = match.map(Number);
  const nextWidth = width / scale;
  const nextHeight = height / scale;
  const nextX = x - (nextWidth - width) / 2;
  const nextY = y - (nextHeight - height) / 2;

  return svg.replace(
    viewBoxPattern,
    `viewBox="${formatSvgNumber(nextX)} ${formatSvgNumber(nextY)} ${formatSvgNumber(nextWidth)} ${formatSvgNumber(nextHeight)}"`,
  );
}

function collectPaintValues(svg: string): string[] {
  const values: string[] = [];

  for (const match of svg.matchAll(PAINT_ATTR_PATTERN)) {
    values.push(match[1]);
  }
  for (const match of svg.matchAll(PAINT_CSS_PATTERN)) {
    values.push(match[1]);
  }

  return values;
}

function isIgnoredPaint(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (IGNORED_PAINT.has(normalized)) {
    return true;
  }
  // Gradients / masks / clip references are not solid brand colors.
  return normalized.startsWith("url(");
}

function isMonochromePaint(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (MONOCHROME_NAMED.has(normalized)) {
    return true;
  }

  const hex = parseHexColor(normalized);
  return hex === "000000" || hex === "ffffff";
}

function parseHexColor(value: string): string | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!match) {
    return null;
  }

  const raw = match[1].toLowerCase();
  if (raw.length === 3) {
    return raw
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  return raw;
}

function formatSvgNumber(value: number): string {
  const formatted = value.toFixed(4).replace(/\.0+$|(?<=\.\d*?)0+$/g, "");
  return formatted === "-0" ? "0" : formatted;
}
