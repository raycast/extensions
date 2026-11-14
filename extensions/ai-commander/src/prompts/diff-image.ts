import { wellFormed } from "../core/text";
import type { DiffSegment } from "./diff";

/**
 * Renders a diff as an inline SVG image, because Raycast's Markdown cannot color text: its sanitizer removes `style`
 * and `<mark>`, and `<ins>` only underlines. Images are the one thing that gets through. Raycast 2 draws Detail views
 * in a WebKit view, where `data:image/svg+xml` sources and `<foreignObject>` work, so the browser lays out and wraps
 * the text. Checked against Raycast 2.10.1's bundled frontend (2026-11-02). This is not a documented API, which is why
 * callers keep a plain text view one shortcut away, and why this module is free of any other dependency on it.
 */

export type Appearance = "light" | "dark";

export interface DiffImageOptions {
  appearance: Appearance;
  /** Logical width. Raycast scales a wider image down to its pane. */
  width?: number;
}

interface Palette {
  text: string;
  added: string;
  removed: string;
}

const PALETTES: Record<Appearance, Palette> = {
  dark: { text: "#f2f2f2", added: "rgba(48,209,88,0.28)", removed: "#ff5a5f" },
  light: { text: "#1c1c1e", added: "rgba(52,199,89,0.3)", removed: "#ff3b30" },
};

const DEFAULT_WIDTH = 470;
const FONT_SIZE = 14;
const LINE_HEIGHT = 21;
/**
 * Glyph widths in pixels at 14 px, on the generous side: extra height shows as a small gap, too little would cut off
 * text. Checked in WebKit with Latin, Cyrillic, CJK, emoji, capitals, digits, and tabs.
 */
const LOWERCASE_WIDTH = 7;
const DIGIT_WIDTH = 9;
const CAPITAL_WIDTH = 10;
const NON_LATIN_WIDTH = 8.4;
const FULL_WIDTH = 15;
const EMOJI_WIDTH = 20;
const TAB_WIDTH = 32;
/** Lines break at word ends and leave space unused, so they hold less than the full width. */
const USABLE_LINE_SHARE = 0.95;
/** Safety margin on the line count, for text that is wider than its letters suggest. */
const LINE_MARGIN = 1.05;
/** Above this, the image gets slow to encode and to decode, and the caller falls back to Markdown. */
export const MAX_DIFF_IMAGE_CHARS = 12_000;

/** Removes what XML forbids. A single stray control character would make the whole image fail to load. */
function escapeXml(text: string): string {
  return (
    wellFormed(text)
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
  );
}

function highlighted(text: string, palette: Palette): string {
  // Spaces and line breaks around a change stay unhighlighted, otherwise they show as green stubs at line ends.
  const core = text.trim();
  if (core === "") return escapeXml(text);
  const start = text.indexOf(core);
  const style = `background:${palette.added};border-radius:3px`;
  return `${escapeXml(text.slice(0, start))}<span style="${style}">${escapeXml(core)}</span>${escapeXml(text.slice(start + core.length))}`;
}

function removalMarker(palette: Palette): string {
  const style = `display:inline-block;width:2px;height:1em;margin:0 1px;vertical-align:-2px;background:${palette.removed}`;
  return `<span style="${style}"></span>`;
}

function segmentHtml(segment: DiffSegment, palette: Palette): string {
  if (segment.type === "equal") return escapeXml(segment.text);
  return segment.added === "" ? removalMarker(palette) : highlighted(segment.added, palette);
}

function glyphWidth(codePoint: number): number {
  if (codePoint === 9) return TAB_WIDTH;
  if (codePoint >= 0x1f000) return EMOJI_WIDTH;
  // From the Hangul Jamo block on: CJK and other full-width glyphs.
  if (codePoint >= 0x1100) return FULL_WIDTH;
  // From the Greek block on: Cyrillic and other scripts, which run wider than Latin.
  if (codePoint >= 0x370) return NON_LATIN_WIDTH;
  if (codePoint >= 65 && codePoint <= 90) return CAPITAL_WIDTH;
  return codePoint >= 48 && codePoint <= 57 ? DIGIT_WIDTH : LOWERCASE_WIDTH;
}

/** The SVG needs a fixed height before the browser has laid out anything, and it clips whatever does not fit. */
function estimateHeight(segments: readonly DiffSegment[], width: number): number {
  const usableWidth = width * USABLE_LINE_SHARE;
  const text = segments.map((segment) => (segment.type === "equal" ? segment.text : segment.added)).join("");
  let lines = 0;
  for (const line of text.split("\n")) {
    let lineWidth = 0;
    for (const char of line) lineWidth += glyphWidth(char.codePointAt(0) ?? 0);
    lines += Math.max(1, Math.ceil(lineWidth / usableWidth));
  }
  return (Math.ceil(lines * LINE_MARGIN) + 1) * LINE_HEIGHT;
}

export function renderDiffSvg(segments: readonly DiffSegment[], options: DiffImageOptions): string {
  const width = options.width ?? DEFAULT_WIDTH;
  const palette = PALETTES[options.appearance];
  const style =
    `font:${FONT_SIZE}px/${LINE_HEIGHT}px -apple-system,system-ui,sans-serif;color:${palette.text};` +
    "white-space:pre-wrap;word-break:break-word";
  const body = segments.map((segment) => segmentHtml(segment, palette)).join("");
  const height = estimateHeight(segments, width);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<foreignObject width="100%" height="100%">` +
    `<div xmlns="http://www.w3.org/1999/xhtml" style="${style}">${body}</div>` +
    `</foreignObject></svg>`
  );
}

/** A Markdown image, or undefined when the text is too long for one. */
export function renderDiffImage(segments: readonly DiffSegment[], options: DiffImageOptions): string | undefined {
  const length = segments.reduce(
    (sum, segment) => sum + (segment.type === "equal" ? segment.text.length : segment.added.length),
    0,
  );
  if (length > MAX_DIFF_IMAGE_CHARS) return undefined;
  // Markdown ends the URL at an unbalanced parenthesis, and encodeURIComponent leaves parentheses as they are.
  const source = encodeURIComponent(renderDiffSvg(segments, options)).replace(
    /[()']/g,
    (char) => `%${char.charCodeAt(0).toString(16)}`,
  );
  return `![Changes](data:image/svg+xml,${source})`;
}
