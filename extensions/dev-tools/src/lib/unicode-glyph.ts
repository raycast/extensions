// Renders a Unicode code point as an SVG data URI for use as a Grid/List icon or
// in Detail markdown. Printable characters become a centered glyph; controls,
// formats, surrogates, and unassigned code points become a dashed "abbreviation
// box" (matching the boxed controls in unicode-table references). Modeled on the
// SVG-to-data-URI approach in color-slider.ts.
import { environment } from "@raycast/api";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const GLYPH_FONTS = "-apple-system,'Helvetica Neue',Arial,'Apple Color Emoji','Segoe UI Emoji','Noto Sans',sans-serif";

const fg = () => (environment.appearance === "dark" ? "#eaeaea" : "#1d1d1f");

// Short abbreviations for the C0 (0x00–0x1F, 0x7F) and C1 (0x80–0x9F) controls.
export const CONTROL_ABBR: Record<number, string> = {
  0x00: "NUL", 0x01: "SOH", 0x02: "STX", 0x03: "ETX", 0x04: "EOT", 0x05: "ENQ", 0x06: "ACK", 0x07: "BEL",
  0x08: "BS", 0x09: "HT", 0x0a: "LF", 0x0b: "VT", 0x0c: "FF", 0x0d: "CR", 0x0e: "SO", 0x0f: "SI",
  0x10: "DLE", 0x11: "DC1", 0x12: "DC2", 0x13: "DC3", 0x14: "DC4", 0x15: "NAK", 0x16: "SYN", 0x17: "ETB",
  0x18: "CAN", 0x19: "EM", 0x1a: "SUB", 0x1b: "ESC", 0x1c: "FS", 0x1d: "GS", 0x1e: "RS", 0x1f: "US",
  0x7f: "DEL",
  0x80: "PAD", 0x81: "HOP", 0x82: "BPH", 0x83: "NBH", 0x84: "IND", 0x85: "NEL", 0x86: "SSA", 0x87: "ESA",
  0x88: "HTS", 0x89: "HTJ", 0x8a: "LTS", 0x8b: "PLD", 0x8c: "PLU", 0x8d: "RI", 0x8e: "SS2", 0x8f: "SS3",
  0x90: "DCS", 0x91: "PU1", 0x92: "PU2", 0x93: "STS", 0x94: "CCH", 0x95: "MW", 0x96: "SPA", 0x97: "EPA",
  0x98: "SOS", 0x99: "SGCI", 0x9a: "SCI", 0x9b: "CSI", 0x9c: "ST", 0x9d: "OSC", 0x9e: "PM", 0x9f: "APC",
}; // prettier-ignore

const hex4 = (cp: number) => cp.toString(16).toUpperCase().padStart(4, "0");

function isBoxed(gc: string): boolean {
  return gc === "Cc" || gc === "Cf" || gc === "Cs" || gc === "Cn";
}

function svgDataUri(size: number, body: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">${body}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function glyphBody(cp: number, gc: string, fontSize: number): string {
  const color = fg();
  if (isBoxed(gc)) {
    const label = CONTROL_ABBR[cp] ?? hex4(cp);
    const fs = label.length <= 3 ? 26 : label.length <= 4 ? 22 : 18;
    return (
      `<rect x="16" y="22" width="68" height="56" rx="10" fill="none" stroke="${color}" ` +
      `stroke-opacity="0.55" stroke-width="2.5" stroke-dasharray="5 4"/>` +
      `<text x="50" y="${50 + fs * 0.35}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" ` +
      `font-size="${fs}" font-weight="600" fill="${color}">${esc(label)}</text>`
    );
  }
  return (
    `<text x="50" y="${50 + fontSize * 0.35}" text-anchor="middle" font-family="${GLYPH_FONTS}" ` +
    `font-size="${fontSize}" fill="${color}">${esc(String.fromCodePoint(cp))}</text>`
  );
}

// Re-renders (e.g. on pagination) revisit the same cells; cache by code point + theme.
const iconCache = new Map<string, string>();

/** Small icon for a Grid cell or List row. */
export function glyphIcon(cp: number, gc: string): string {
  const key = `${cp}:${environment.appearance}`;
  const hit = iconCache.get(key);
  if (hit) return hit;
  const uri = svgDataUri(128, glyphBody(cp, gc, 62));
  iconCache.set(key, uri);
  return uri;
}

/** Larger glyph for the character Detail markdown. */
export function glyphImage(cp: number, gc: string): string {
  return svgDataUri(320, glyphBody(cp, gc, 60));
}
