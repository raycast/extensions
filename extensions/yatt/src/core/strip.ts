import type { HourRange } from "./types";
import { shadeOf, type Shade } from "./business";
import { wallParts, wallToInstant } from "./time";

export type StripRow = {
  label: string;
  /** Short column header, e.g. "SFO"; falls back to the label. */
  code?: string;
  abbr?: string;
  tz: string;
  business: HourRange;
  shoulder: HourRange;
  isAnchor?: boolean;
};

export type StripOptions = {
  /** Anchor instant (window start). */
  start: number;
  end?: number;
  anchorTz: string;
  rows: StripRow[];
  fmt: "24h" | "12h";
  dark?: boolean;
  /** Hex overrides per shade; the built-in palette fills the gaps. */
  colors?: Partial<Record<Shade, string>>;
};

const COLORS: Record<Shade, { light: string; dark: string }> = {
  business: { light: "#7cc47f", dark: "#3f8f45" },
  shoulder: { light: "#f0d264", dark: "#a8891f" },
  off: { light: "#e5e7eb", dark: "#3a3f4b" },
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Hours shown above the selection; the band therefore always starts on the same row. */
export const STRIP_ABOVE = 6;
/** Minimum rows in the strip; longer windows extend it. */
export const STRIP_ROWS = 16;

/**
 * One column per location, one row per hour, so a horizontal line across the columns is one instant.
 * The view is a window of STRIP_ROWS hours starting STRIP_ABOVE hours before the selection, so the
 * selected band sits at a fixed position and the pane never scrolls. Cells show the local hour (weekday
 * at midnight) and are coloured by business hours.
 */
export function renderStripSvg(o: StripOptions): string {
  const dark = o.dark ?? true;
  const cellW = 44;
  const cellH = 15;
  const gap = 2;
  const left = 6;
  const top = 34;
  const cols = o.rows.length;
  const p = wallParts(o.start, o.anchorTz);
  const day0 = wallToInstant(o.anchorTz, p.y, p.m, p.d);
  const s = (o.start - day0) / 3600000;
  const e = o.end !== undefined ? (o.end - day0) / 3600000 : Math.floor(s) + 1;
  const firstHour = Math.floor(s) - STRIP_ABOVE;
  const rowCount = Math.max(STRIP_ROWS, Math.ceil(e) - firstHour + STRIP_ABOVE);
  const width = left * 2 + cols * (cellW + gap) - gap;
  const height = top + rowCount * (cellH + gap) - gap + 6;
  const text = dark ? "#e6e6e6" : "#222";
  const muted = dark ? "#9aa0a6" : "#666";
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" font-family="-apple-system,Helvetica,Arial,sans-serif" font-size="10">`,
  );
  o.rows.forEach((row, c) => {
    const x = left + c * (cellW + gap);
    const cx = x + cellW / 2;
    const head = (row.code ?? row.label).slice(0, 9);
    parts.push(
      `<text x="${cx}" y="12" fill="${text}" text-anchor="middle" font-size="11" font-weight="${row.isAnchor ? 700 : 500}">${esc(head)}</text>`,
    );
    if (row.abbr) parts.push(`<text x="${cx}" y="25" fill="${muted}" text-anchor="middle">${esc(row.abbr)}</text>`);
    for (let i = 0; i < rowCount; i++) {
      const y = top + i * (cellH + gap);
      const w = wallParts(day0 + (firstHour + i) * 3600000, row.tz);
      const shade = shadeOf(w.h + w.min / 60, row.business, row.shoulder);
      parts.push(
        `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="3" fill="${o.colors?.[shade] ?? COLORS[shade][dark ? "dark" : "light"]}"/>`,
      );
      const label = w.h === 0 && w.min === 0 ? WEEKDAYS[w.weekday] : hourLabel(w.h, w.min, o.fmt);
      parts.push(
        `<text x="${cx}" y="${y + 11}" fill="${dark ? "#fff" : "#111"}" fill-opacity="${shade === "off" ? 0.6 : 0.95}" text-anchor="middle">${label}</text>`,
      );
    }
  });
  // The band covers whole rows: a live 15:24 or a 13:15 start highlights the hour it falls in, not a slice of it.
  const y1 = top + (Math.floor(s) - firstHour) * (cellH + gap);
  const y2 = top + (Math.ceil(e) - firstHour) * (cellH + gap) - gap;
  if (y2 > y1) {
    parts.push(
      `<rect x="${left - 2}" y="${y1 - 2}" width="${width - left * 2 + 4}" height="${y2 - y1 + 4}" rx="4" fill="none" stroke="${dark ? "#fff" : "#111"}" stroke-width="2"/>`,
    );
  }
  parts.push("</svg>");
  return parts.join("");
}

function hourLabel(h: number, min: number, fmt: "24h" | "12h"): string {
  const mm = min ? `:${String(min).padStart(2, "0")}` : "";
  if (fmt === "12h") return `${h % 12 === 0 ? 12 : h % 12}${mm}${h < 12 ? "a" : "p"}`;
  return `${h}${mm}`;
}

export function stripMarkdown(o: StripOptions): string {
  const svg = renderStripSvg(o);
  return `![hours](data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")})`;
}

/** Monospace fallback when SVG cannot be rendered. */
export function stripText(o: StripOptions): string {
  const p = wallParts(o.start, o.anchorTz);
  const day0 = wallToInstant(o.anchorTz, p.y, p.m, p.d);
  const glyph: Record<Shade, string> = { business: "█", shoulder: "▓", off: "░" };
  const width = Math.max(...o.rows.map((r) => r.label.length), 6);
  const lines = o.rows.map((row) => {
    let s = "";
    for (let i = 0; i < 24; i++) {
      const w = wallParts(day0 + i * 3600000, row.tz);
      s += glyph[shadeOf(w.h + w.min / 60, row.business, row.shoulder)];
    }
    return `${row.label.padEnd(width)} ${s}`;
  });
  const s = Math.floor((o.start - day0) / 3600000);
  const e = o.end !== undefined ? Math.ceil((o.end - day0) / 3600000) : s + 1;
  const marker = " ".repeat(width + 1 + Math.max(0, s)) + "^".repeat(Math.max(1, Math.min(24, e) - Math.max(0, s)));
  return "```\n" + lines.join("\n") + "\n" + marker + "\n```";
}
