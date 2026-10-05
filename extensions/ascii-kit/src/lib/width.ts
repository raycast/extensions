// Display width of text in a monospace font: what alignment in a code block depends on.
//
// Wide (2 columns): emoji with emoji presentation, anything followed by VS16, and East Asian
// wide/fullwidth characters. Zero: combining marks and zero-width joiners. Everything else: 1.
// Box-drawing characters are "ambiguous" in the Unicode tables but render 1 column wide in
// every Western monospace font, so they count as 1.

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

const WIDE_RANGES: [number, number][] = [
  [0x1100, 0x115f],
  [0x2e80, 0x303e],
  [0x3041, 0x33ff],
  [0x3400, 0x4dbf],
  [0x4e00, 0x9fff],
  [0xa000, 0xa4cf],
  [0xac00, 0xd7a3],
  [0xf900, 0xfaff],
  [0xfe30, 0xfe4f],
  [0xff00, 0xff60],
  [0xffe0, 0xffe6],
  [0x20000, 0x3fffd],
];

function isWideCodePoint(cp: number): boolean {
  return WIDE_RANGES.some(([lo, hi]) => cp >= lo && cp <= hi);
}

export function graphemes(text: string): string[] {
  return Array.from(segmenter.segment(text), (s) => s.segment);
}

export function graphemeWidth(g: string): number {
  if (/^[\p{Mn}\p{Me}\u200b-\u200f\u2060\ufeff]+$/u.test(g)) return 0;
  if (g.includes("\ufe0f") || /\p{Emoji_Presentation}/u.test(g)) return 2;
  const cp = g.codePointAt(0) ?? 0;
  return isWideCodePoint(cp) ? 2 : 1;
}

export function displayWidth(text: string): number {
  let w = 0;
  for (const g of graphemes(text)) w += graphemeWidth(g);
  return w;
}

/** Shortens `text` to at most `width` columns, ending in `…` when anything was cut. */
export function truncate(text: string, width: number): string {
  if (displayWidth(text) <= width) return text;
  let out = "";
  let w = 0;
  for (const g of graphemes(text)) {
    const gw = graphemeWidth(g);
    if (w + gw > width - 1) break;
    out += g;
    w += gw;
  }
  return out + "…";
}

export function padEnd(text: string, width: number, fill = " "): string {
  return text + fill.repeat(Math.max(0, width - displayWidth(text)));
}

export function padStart(text: string, width: number, fill = " "): string {
  return fill.repeat(Math.max(0, width - displayWidth(text))) + text;
}

export function padCenter(text: string, width: number, fill = " "): string {
  const gap = Math.max(0, width - displayWidth(text));
  const left = Math.floor(gap / 2);
  return fill.repeat(left) + text + fill.repeat(gap - left);
}

/**
 * Glyphs whose width depends on the renderer: text-default emoji (⚠ ☑ ✔ ▶) that some apps and
 * fonts draw as 2-column emoji, which breaks alignment. Returned de-duplicated, in input order.
 */
export function riskyGlyphs(text: string): string[] {
  const found = new Set<string>();
  for (const g of graphemes(text)) {
    if (graphemeWidth(g) === 1 && /\p{Extended_Pictographic}/u.test(g)) found.add(g);
  }
  return [...found];
}

/** Tab stops by display column, so a tab after CJK or emoji lands where an editor puts it. */
export function expandTabs(line: string, tabSize = 4): string {
  if (!line.includes("\t")) return line;
  let out = "";
  let col = 0;
  for (const g of graphemes(line)) {
    if (g === "\t") {
      const n = tabSize - (col % tabSize);
      out += " ".repeat(n);
      col += n;
    } else {
      out += g;
      col += graphemeWidth(g);
    }
  }
  return out;
}

export function splitLines(text: string): string[] {
  return text.replace(/\r\n?/g, "\n").split("\n");
}
