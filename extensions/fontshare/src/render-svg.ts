import { parse, Path } from "opentype.js";

type OpenTypeFont = ReturnType<typeof parse>;
type Glyph = ReturnType<OpenTypeFont["charToGlyph"]>;

export interface TextBlock {
  data: ArrayBuffer;
  text: string;
  size: number;
}

// Pair previews are drawn on a fixed 3:2 card, matching the grid's aspect ratio.
const CARD_WIDTH = 600;
const CARD_HEIGHT = 400;
const CARD_PADDING = 40;
const HEADLINE_MAX_LINES = 2;
const TEXT_MAX_LINES = 3;

// Path.toPathData() is not used: its rounding returns NaN for values like 96.00000000000001 (opentype.js 2.0.0),
// which makes SVG renderers drop the rest of the path.
function toPathData(path: Path): string {
  const n = (value: number) => String(Math.round(value * 100) / 100);
  return path.commands
    .map((command) => {
      switch (command.type) {
        case "M":
        case "L":
          return `${command.type}${n(command.x)} ${n(command.y)}`;
        case "Q":
          return `Q${n(command.x1)} ${n(command.y1)} ${n(command.x)} ${n(command.y)}`;
        case "C":
          return `C${n(command.x1)} ${n(command.y1)} ${n(command.x2)} ${n(command.y2)} ${n(command.x)} ${n(command.y)}`;
        case "Z":
          return "Z";
      }
    })
    .join("");
}

// width and height give Raycast the image's intrinsic aspect ratio; without them it crops the SVG in grid cells.
function toSvg(path: Path, viewBox: number[]): string {
  const [, , width, height] = viewBox.map((n) => n.toFixed(2));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox.map((n) => n.toFixed(2)).join(" ")}"><path d="${toPathData(path)}"/></svg>`;
}

function kerning(font: OpenTypeFont, left: Glyph, right: Glyph): number {
  try {
    return font.getKerningValue(left, right);
  } catch {
    // Kerning is cosmetic; ignore unsupported tables.
    return 0;
  }
}

// Glyphs are laid out by hand instead of font.getPath(): opentype.js throws on some GSUB lookups used by Fontshare
// fonts. Draws `text` into `path` (when given) from (x, y) and returns the x where the text ends.
function drawText(font: OpenTypeFont, text: string, x: number, y: number, size: number, path?: Path): number {
  const scale = size / font.unitsPerEm;
  let previous: Glyph | undefined;

  for (const char of text) {
    const glyph = font.charToGlyph(char);
    if (previous) {
      x += kerning(font, previous, glyph) * scale;
    }
    path?.extend(glyph.getPath(x, y, size));
    x += (glyph.advanceWidth ?? 0) * scale;
    previous = glyph;
  }
  return x;
}

function wrapText(font: OpenTypeFont, text: string, size: number, maxWidth: number, maxLines: number): string[] {
  const fits = (line: string) => drawText(font, line, 0, 0, size) <= maxWidth;
  const lines: string[] = [];
  let line = "";

  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (!line || fits(candidate)) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);

  if (lines.length <= maxLines) {
    return lines;
  }
  const kept = lines.slice(0, maxLines);
  let last = kept[kept.length - 1];
  while (!fits(`${last}…`) && last.includes(" ")) {
    last = last.slice(0, last.lastIndexOf(" "));
  }
  kept[kept.length - 1] = `${last}…`;
  return kept;
}

// Centers the outlines in a card of the given aspect ratio, leaving `margin` of the outlines' size around them.
function fitToCard(path: Path, aspectRatio: number, margin: number): string {
  const box = path.getBoundingBox();
  const width = box.x2 - box.x1;
  const height = box.y2 - box.y1;
  if (!(width > 0 && height > 0)) {
    throw new Error("Font has no outlines for the preview text");
  }

  let cardWidth = width * (1 + 2 * margin);
  let cardHeight = height * (1 + 2 * margin);
  if (cardWidth / cardHeight > aspectRatio) {
    cardHeight = cardWidth / aspectRatio;
  } else {
    cardWidth = cardHeight * aspectRatio;
  }
  return toSvg(path, [box.x1 - (cardWidth - width) / 2, box.y1 - (cardHeight - height) / 2, cardWidth, cardHeight]);
}

/** Renders "Aa" cropped to its outlines, for grid thumbnails. */
export function renderSampleSvg(data: ArrayBuffer): string {
  const font = parse(data);
  const path = new Path();
  drawText(font, "Aa", 0, 0, 100, path);
  return fitToCard(path, 1, 0.125);
}

/**
 * Renders free text on a 3:2 card: short text stays on one line, longer text is wrapped (up to three centered lines)
 * so the block keeps roughly the card's proportions.
 */
export function renderTextSvg(data: ArrayBuffer, text: string): string {
  const font = parse(data);
  const size = 100;
  const lineHeight = size * 1.2;
  const width = drawText(font, text, 0, 0, size);
  const lineCount = Math.min(TEXT_MAX_LINES, Math.max(1, Math.round(Math.sqrt(width / (1.5 * lineHeight)))));
  const lines = wrapText(font, text, size, (width / lineCount) * 1.15, TEXT_MAX_LINES);

  const widths = lines.map((line) => drawText(font, line, 0, 0, size));
  const blockWidth = Math.max(...widths);
  const path = new Path();
  lines.forEach((line, index) => {
    drawText(font, line, (blockWidth - widths[index]) / 2, index * lineHeight, size, path);
  });
  return fitToCard(path, 3 / 2, 0.1);
}

/** Renders a pairing card: the headline text set in the headline font above the body text set in the body font. */
export function renderPairSvg(headline: TextBlock, body: TextBlock): string {
  const path = new Path();
  const maxWidth = CARD_WIDTH - CARD_PADDING * 2;
  let top = CARD_PADDING;

  const headlineFont = parse(headline.data);
  const headlineLineHeight = headline.size * 1.15;
  const headlineAscent = (headlineFont.ascender / headlineFont.unitsPerEm) * headline.size;
  const headlineLines = wrapText(headlineFont, headline.text, headline.size, maxWidth, HEADLINE_MAX_LINES);
  headlineLines.forEach((line, index) => {
    drawText(headlineFont, line, CARD_PADDING, top + headlineAscent + index * headlineLineHeight, headline.size, path);
  });
  top += headlineLines.length * headlineLineHeight + body.size * 1.5;

  const bodyFont = parse(body.data);
  const bodyLineHeight = body.size * 1.5;
  const bodyAscent = (bodyFont.ascender / bodyFont.unitsPerEm) * body.size;
  const bodyMaxLines = Math.max(1, Math.floor((CARD_HEIGHT - CARD_PADDING - top) / bodyLineHeight));
  wrapText(bodyFont, body.text, body.size, maxWidth, bodyMaxLines).forEach((line, index) => {
    drawText(bodyFont, line, CARD_PADDING, top + bodyAscent + index * bodyLineHeight, body.size, path);
  });

  return toSvg(path, [0, 0, CARD_WIDTH, CARD_HEIGHT]);
}
