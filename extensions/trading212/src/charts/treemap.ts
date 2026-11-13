import { formatPct } from "../lib/format";
import { emptyChart } from "./shared";
import { escapeXml, svgDocument } from "./svg";
import { chartTheme, returnColor, type Appearance } from "./theme";

export interface TreemapInput {
  label: string;
  value: number;
  returnPct: number;
}

export interface TreemapTile extends TreemapInput {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Sized extends TreemapInput {
  area: number;
}

function worstRatio(row: Sized[], side: number): number {
  const s = row.reduce((a, r) => a + r.area, 0);
  const max = Math.max(...row.map((r) => r.area));
  const min = Math.min(...row.map((r) => r.area));
  return Math.max((side * side * max) / (s * s), (s * s) / (side * side * min));
}

export function squarify(items: TreemapInput[], width: number, height: number): TreemapTile[] {
  const sorted = items.filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const total = sorted.reduce((a, i) => a + i.value, 0);
  if (!sorted.length || width <= 0 || height <= 0) return [];
  const rest: Sized[] = sorted.map((i) => ({ ...i, area: (i.value / total) * width * height }));
  const out: TreemapTile[] = [];
  let x = 0;
  let y = 0;
  let w = width;
  let h = height;
  let idx = 0;

  while (idx < rest.length) {
    const side = Math.min(w, h);
    let row: Sized[] = [];
    let end = idx;
    while (end < rest.length) {
      const next = [...row, rest[end]];
      if (row.length && worstRatio(next, side) > worstRatio(row, side)) break;
      row = next;
      end++;
    }
    const s = row.reduce((a, r) => a + r.area, 0);
    const isLast = end >= rest.length;
    if (w >= h) {
      const rw = isLast ? w : s / h;
      let cy = y;
      for (const r of row) {
        const rh = (r.area / s) * h;
        out.push({ label: r.label, value: r.value, returnPct: r.returnPct, x, y: cy, w: rw, h: rh });
        cy += rh;
      }
      x += rw;
      w -= rw;
    } else {
      const rh = isLast ? h : s / w;
      let cx = x;
      for (const r of row) {
        const rw = (r.area / s) * w;
        out.push({ label: r.label, value: r.value, returnPct: r.returnPct, x: cx, y, w: rw, h: rh });
        cx += rw;
      }
      y += rh;
      h -= rh;
    }
    idx = end;
  }
  return out;
}

const GAP = 1.5;
const LABEL_PAD = 3;
const CHAR_WIDTH = 0.62;
export function renderTreemap(
  items: TreemapInput[],
  opts: { width: number; height: number; appearance: Appearance },
): string {
  const { width, height, appearance } = opts;
  const theme = chartTheme(appearance);
  const tiles = squarify(items, width, height);
  if (!tiles.length) return emptyChart(theme, width, height, "No positions yet");

  const labelColor = appearance === "dark" ? "#ffffff" : theme.text;
  const subColor = appearance === "dark" ? "rgba(255,255,255,.75)" : "rgba(31,35,33,.7)";
  let inner = "";
  for (const t of tiles) {
    const x = t.x + GAP;
    const y = t.y + GAP;
    const w = Math.max(0, t.w - 2 * GAP);
    const h = Math.max(0, t.h - 2 * GAP);
    inner += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${returnColor(t.returnPct, theme)}"/>`;
    if (w >= 34 && h >= 26) {
      const pct = formatPct(t.returnPct, { signed: true });
      const avail = w - 2 * LABEL_PAD;
      const cx = x + w / 2;
      const cy = y + h / 2;
      const fits = (chars: number, fs: number) => chars * fs * CHAR_WIDTH <= avail;
      const subSize = (fs: number) => Math.max(8, fs * 0.8);
      let fs = Math.max(8, Math.min(15, h / 2.6));
      while (fs > 8 && !(fits(t.label.length, fs) && fits(pct.length, subSize(fs)))) fs = Math.max(8, fs - 0.5);
      const font = `font-family="${theme.fontFamily}"`;
      if (fits(t.label.length, fs) && fits(pct.length, subSize(fs))) {
        inner += `<text x="${cx}" y="${cy - 1}" fill="${labelColor}" font-size="${fs}" font-weight="600" text-anchor="middle" ${font}>${escapeXml(t.label)}</text>`;
        inner += `<text x="${cx}" y="${cy + fs * 0.95}" fill="${subColor}" font-size="${subSize(fs)}" text-anchor="middle" ${font}>${escapeXml(pct)}</text>`;
      } else if (fits(t.label.length, 8)) {
        inner += `<text x="${cx}" y="${cy + 3}" fill="${labelColor}" font-size="8" font-weight="600" text-anchor="middle" ${font}>${escapeXml(t.label)}</text>`;
      }
    }
  }
  return svgDocument(inner, width, height);
}
