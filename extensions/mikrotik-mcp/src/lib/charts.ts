/**
 * SVG chart kit — renders real charts as inline `data:image/svg+xml;base64`
 * images that Raycast's Detail/List markdown embeds via `![](…)`. No disk I/O,
 * no external hosts, theme-aware (reads `environment.appearance`). Each chart is
 * its own SVG document, so gradient/filter ids are safely reused across charts.
 *
 * Every SVG background is transparent so charts sit on Raycast's own panel; ink
 * and grid tones adapt to light/dark. This replaces the unicode sparklines in the
 * data-dense views (overview, devices, usage, drift, packets) with proper
 * area/line charts, donuts, radial gauges, rounded bar charts, and a
 * GitHub-style activity heatmap.
 */
import { Color, environment } from "@raycast/api";

// ── palette + theme ─────────────────────────────────────────────────────────

/** Map a Raycast Color (or pass-through hex) to a vivid hex for SVG strokes/fills. */
export function colorToHex(c: Color | string): string {
  if (typeof c === "string" && c.startsWith("#")) return c;
  switch (c) {
    case Color.Green:
      return "#34d399";
    case Color.Yellow:
      return "#f5c542";
    case Color.Red:
      return "#f0616d";
    case Color.Blue:
      return "#3291ff";
    case Color.Purple:
      return "#a78bfa";
    case Color.Orange:
      return "#f59e0b";
    case Color.Magenta:
      return "#e879c9";
    default:
      return "#8b93a1";
  }
}

interface Theme {
  ink: string;
  faint: string;
  grid: string;
  track: string;
}
function theme(): Theme {
  const dark = environment.appearance === "dark";
  return dark
    ? {
        ink: "#c7ccd4",
        faint: "#8b93a1",
        grid: "rgba(255,255,255,0.07)",
        track: "rgba(255,255,255,0.10)",
      }
    : {
        ink: "#3a3f47",
        faint: "#7a828e",
        grid: "rgba(0,0,0,0.06)",
        track: "rgba(0,0,0,0.08)",
      };
}

const FONT = "-apple-system,BlinkMacSystemFont,system-ui,sans-serif";

// ── encoding ────────────────────────────────────────────────────────────────

function uri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}
/** Wrap a raw SVG document as a markdown image line. */
export function chartImage(svg: string, alt = "chart"): string {
  return `![${alt}](${uri(svg)})`;
}
/** A bare data-URI for an SVG — usable as a Raycast `Image` source (e.g. an accessory icon). */
export function svgIcon(svg: string): string {
  return uri(svg);
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function n2(x: number): string {
  return x.toFixed(1);
}

// ── geometry helpers ────────────────────────────────────────────────────────

/** Catmull-Rom → cubic-bezier smoothing through a run of points. */
function smooth(pts: Array<[number, number]>): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${n2(pts[0][0])},${n2(pts[0][1])}`;
  let d = `M ${n2(pts[0][0])},${n2(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${n2(c1x)},${n2(c1y)} ${n2(c2x)},${n2(c2y)} ${n2(p2[0])},${n2(p2[1])}`;
  }
  return d;
}

function polar(
  cx: number,
  cy: number,
  r: number,
  deg: number,
): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}
function arc(
  cx: number,
  cy: number,
  r: number,
  a0: number,
  a1: number,
): string {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  const sweep = a1 > a0 ? 1 : 0;
  return `M ${n2(x0)},${n2(y0)} A ${r},${r} 0 ${large} ${sweep} ${n2(x1)},${n2(y1)}`;
}

// ── area / line chart ───────────────────────────────────────────────────────

export interface AreaOpts {
  width?: number;
  height?: number;
  color?: Color | string;
  label?: string;
  unit?: string;
  dots?: boolean;
}

/** A smooth gradient-filled area chart with a glowing last point and min/max guides. */
export function areaChart(
  values: Array<number | null | undefined>,
  opts?: AreaOpts,
): string {
  const W = opts?.width ?? 720;
  const H = opts?.height ?? 150;
  const c = colorToHex(opts?.color ?? Color.Blue);
  const t = theme();
  const PL = 10;
  const PR = 44;
  const PT = 14;
  const PB = 14;
  const cw = W - PL - PR;
  const ch = H - PT - PB;

  const present = values.filter(
    (v): v is number => v != null && Number.isFinite(v),
  );
  if (present.length === 0) return "";
  const min = Math.min(...present);
  const max = Math.max(...present);
  const range = max - min || 1;
  const n = values.length;
  const xAt = (i: number) => (n <= 1 ? PL + cw / 2 : PL + (i / (n - 1)) * cw);
  const yAt = (v: number) => PT + ch - ((v - min) / range) * ch;

  // Split into contiguous runs (gap on null) → smoothed line + filled area each.
  const runs: Array<Array<[number, number]>> = [];
  let run: Array<[number, number]> = [];
  values.forEach((v, i) => {
    if (v == null || !Number.isFinite(v)) {
      if (run.length) runs.push(run);
      run = [];
    } else {
      run.push([xAt(i), yAt(v)]);
    }
  });
  if (run.length) runs.push(run);

  const base = PT + ch;
  const lines = runs.map(
    (r) =>
      `<path d="${smooth(r)}" fill="none" stroke="url(#stroke)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  );
  const areas = runs.map((r) => {
    const d = smooth(r);
    return `<path d="${d} L ${n2(r[r.length - 1][0])},${n2(base)} L ${n2(r[0][0])},${n2(base)} Z" fill="url(#fill)" stroke="none"/>`;
  });

  // Last present point → glowing marker + value badge.
  let lastIdx = -1;
  for (let i = n - 1; i >= 0; i--) {
    const v = values[i];
    if (v != null && Number.isFinite(v)) {
      lastIdx = i;
      break;
    }
  }
  const lastV = values[lastIdx] as number;
  const lx = xAt(lastIdx);
  const ly = yAt(lastV);
  const badge = `${Math.round(lastV * 10) / 10}${opts?.unit ?? ""}`;

  const dots =
    opts?.dots && n <= 40
      ? present.length &&
        values
          .map((v, i) =>
            v != null && Number.isFinite(v)
              ? `<circle cx="${n2(xAt(i))}" cy="${n2(yAt(v))}" r="2" fill="${c}" opacity="0.55"/>`
              : "",
          )
          .join("")
      : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONT}">
  <defs>
    <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${c}" stop-opacity="0.34"/>
      <stop offset="1" stop-color="${c}" stop-opacity="0.02"/>
    </linearGradient>
    <linearGradient id="stroke" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${c}" stop-opacity="0.75"/>
      <stop offset="1" stop-color="${c}"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <line x1="${PL}" y1="${n2(PT)}" x2="${PL + cw}" y2="${n2(PT)}" stroke="${t.grid}" stroke-width="1"/>
  <line x1="${PL}" y1="${n2(base)}" x2="${PL + cw}" y2="${n2(base)}" stroke="${t.grid}" stroke-width="1"/>
  ${areas.join("\n  ")}
  ${lines.join("\n  ")}
  ${dots}
  <circle cx="${n2(lx)}" cy="${n2(ly)}" r="3.4" fill="${c}" filter="url(#glow)"/>
  <text x="${n2(Math.min(lx + 7, W - 4))}" y="${n2(ly - 6)}" font-size="11" font-weight="600" fill="${c}" text-anchor="${lx > W - 60 ? "end" : "start"}">${esc(badge)}</text>
  <text x="${W - PR + 6}" y="${n2(PT + 4)}" font-size="9" fill="${t.faint}">${esc(String(Math.round(max * 10) / 10))}${esc(opts?.unit ?? "")}</text>
  <text x="${W - PR + 6}" y="${n2(base)}" font-size="9" fill="${t.faint}">${esc(String(Math.round(min * 10) / 10))}${esc(opts?.unit ?? "")}</text>
  ${opts?.label ? `<text x="${PL}" y="${n2(PT - 3)}" font-size="10" font-weight="600" fill="${t.ink}">${esc(opts.label)}</text>` : ""}
</svg>`;
}

// ── multi-band area (e.g. ok vs error, ↓ vs ↑) ──────────────────────────────

export interface Band {
  values: Array<number | null | undefined>;
  color: Color | string;
  label: string;
}
export function multiAreaChart(
  bands: Band[],
  opts?: { width?: number; height?: number },
): string {
  const W = opts?.width ?? 720;
  const H = opts?.height ?? 160;
  const t = theme();
  const PL = 10;
  const PR = 10;
  const PT = 22;
  const PB = 12;
  const cw = W - PL - PR;
  const ch = H - PT - PB;
  const all = bands.flatMap((b) =>
    b.values.filter((v): v is number => v != null && Number.isFinite(v)),
  );
  if (all.length === 0) return "";
  const min = Math.min(0, ...all);
  const max = Math.max(...all) || 1;
  const range = max - min || 1;
  const base = PT + ch;

  const layers = bands
    .map((b, bi) => {
      const c = colorToHex(b.color);
      const n = b.values.length;
      const xAt = (i: number) =>
        n <= 1 ? PL + cw / 2 : PL + (i / (n - 1)) * cw;
      const yAt = (v: number) => PT + ch - ((v - min) / range) * ch;
      const pts: Array<[number, number]> = [];
      b.values.forEach((v, i) => {
        if (v != null && Number.isFinite(v)) pts.push([xAt(i), yAt(v)]);
      });
      if (pts.length === 0) return "";
      const d = smooth(pts);
      return `<path d="${d} L ${n2(pts[pts.length - 1][0])},${n2(base)} L ${n2(pts[0][0])},${n2(base)} Z" fill="${c}" fill-opacity="0.16"/>
  <path d="${d}" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity="${0.9 - bi * 0.05}"/>`;
    })
    .join("\n  ");

  const legend = bands
    .map((b, i) => {
      const c = colorToHex(b.color);
      const x = PL + i * 132;
      return `<circle cx="${x + 4}" cy="10" r="4" fill="${c}"/><text x="${x + 13}" y="13" font-size="10.5" fill="${t.ink}">${esc(b.label)}</text>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONT}">
  <line x1="${PL}" y1="${n2(base)}" x2="${PL + cw}" y2="${n2(base)}" stroke="${t.grid}"/>
  ${layers}
  ${legend}
</svg>`;
}

// ── donut ───────────────────────────────────────────────────────────────────

export interface Seg {
  label: string;
  value: number;
  color: Color | string;
}
export function donutChart(
  segments: Seg[],
  opts?: { size?: number; centerValue?: string; centerLabel?: string },
): string {
  const size = opts?.size ?? 200;
  const t = theme();
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 14;
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
  const stroke = 18;
  let a = -90;
  const track = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${t.track}" stroke-width="${stroke}"/>`;
  const arcs =
    total > 0
      ? segments
          .filter((s) => s.value > 0)
          .map((s) => {
            const sweep = (s.value / total) * 360;
            const gap = sweep > 8 ? 3 : 0;
            const path = arc(cx, cy, r, a + gap / 2, a + sweep - gap / 2);
            a += sweep;
            return `<path d="${path}" fill="none" stroke="${colorToHex(s.color)}" stroke-width="${stroke}" stroke-linecap="round"/>`;
          })
          .join("\n  ")
      : "";
  const cv = opts?.centerValue ?? String(total);
  const cl = opts?.centerLabel ?? "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" font-family="${FONT}">
  ${track}
  ${arcs}
  <text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="30" font-weight="700" fill="${t.ink}">${esc(cv)}</text>
  ${cl ? `<text x="${cx}" y="${cy + 18}" text-anchor="middle" font-size="11" fill="${t.faint}">${esc(cl)}</text>` : ""}
</svg>`;
}

// ── horizontal bar chart ────────────────────────────────────────────────────

export interface BarItem {
  label: string;
  value: number;
  color?: Color | string;
  sub?: string;
}
export function barChart(
  items: BarItem[],
  opts?: { width?: number; max?: number; unit?: string; labelWidth?: number },
): string {
  const W = opts?.width ?? 720;
  const t = theme();
  const rowH = 26;
  const gap = 8;
  const lw = opts?.labelWidth ?? 150;
  const valW = 62;
  const barX = lw + 8;
  const barW = W - barX - valW;
  const max = opts?.max ?? Math.max(1, ...items.map((i) => i.value));
  const H = items.length * (rowH + gap) + 6;
  const rows = items
    .map((it, i) => {
      const y = 4 + i * (rowH + gap);
      const c = colorToHex(it.color ?? Color.Blue);
      const w = Math.max(2, (it.value / max) * barW);
      const val = `${Math.round(it.value * 10) / 10}${opts?.unit ?? ""}`;
      return `<text x="0" y="${y + rowH / 2 + 4}" font-size="11.5" fill="${t.ink}">${esc(it.label)}</text>
  ${it.sub ? `<text x="0" y="${y + rowH / 2 + 15}" font-size="8.5" fill="${t.faint}">${esc(it.sub)}</text>` : ""}
  <rect x="${barX}" y="${y + 3}" width="${barW}" height="${rowH - 6}" rx="${(rowH - 6) / 2}" fill="${t.track}"/>
  <rect x="${barX}" y="${y + 3}" width="${n2(w)}" height="${rowH - 6}" rx="${(rowH - 6) / 2}" fill="${c}"/>
  <text x="${W}" y="${y + rowH / 2 + 4}" text-anchor="end" font-size="11" font-weight="600" fill="${t.ink}">${esc(val)}</text>`;
    })
    .join("\n  ");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONT}">
  ${rows}
</svg>`;
}

// ── stacked add/remove bars (drift sections) ────────────────────────────────

export interface StackRow {
  label: string;
  added: number;
  removed: number;
}
export function diffBars(rows: StackRow[], opts?: { width?: number }): string {
  const W = opts?.width ?? 720;
  const t = theme();
  const rowH = 22;
  const gap = 6;
  const lw = 220;
  const barX = lw + 8;
  const barW = W - barX - 8;
  const max = Math.max(1, ...rows.map((r) => r.added + r.removed));
  const H = rows.length * (rowH + gap) + 6;
  const g = colorToHex(Color.Green);
  const rd = colorToHex(Color.Red);
  const body = rows
    .map((r, i) => {
      const y = 4 + i * (rowH + gap);
      const aw = (r.added / max) * barW;
      const rw = (r.removed / max) * barW;
      return `<text x="0" y="${y + rowH / 2 + 4}" font-size="10.5" fill="${t.ink}">${esc(r.label)}</text>
  <rect x="${barX}" y="${y + 3}" width="${barW}" height="${rowH - 6}" rx="3" fill="${t.track}"/>
  <rect x="${barX}" y="${y + 3}" width="${n2(aw)}" height="${rowH - 6}" rx="3" fill="${g}"/>
  <rect x="${n2(barX + aw)}" y="${y + 3}" width="${n2(rw)}" height="${rowH - 6}" fill="${rd}"/>
  <text x="${W}" y="${y + rowH / 2 + 4}" text-anchor="end" font-size="9.5" fill="${t.faint}">+${r.added}/−${r.removed}</text>`;
    })
    .join("\n  ");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONT}">
  ${body}
</svg>`;
}

// ── radial gauge (270° arc) ─────────────────────────────────────────────────

export function gaugeChart(
  pct: number,
  opts?: {
    label?: string;
    color?: Color | string;
    size?: number;
    sub?: string;
  },
): string {
  const size = opts?.size ?? 150;
  const t = theme();
  const cx = size / 2;
  const cy = size / 2 + 6;
  const r = size / 2 - 16;
  const p = Math.max(0, Math.min(100, pct));
  const A0 = 135;
  const SWEEP = 270;
  const c = colorToHex(
    opts?.color ?? (p >= 85 ? Color.Red : p >= 60 ? Color.Yellow : Color.Green),
  );
  const track = arc(cx, cy, r, A0, A0 + SWEEP);
  const val = arc(cx, cy, r, A0, A0 + (SWEEP * p) / 100);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" font-family="${FONT}">
  <path d="${track}" fill="none" stroke="${t.track}" stroke-width="11" stroke-linecap="round"/>
  <path d="${val}" fill="none" stroke="${c}" stroke-width="11" stroke-linecap="round"/>
  <text x="${cx}" y="${cy + 3}" text-anchor="middle" font-size="27" font-weight="700" fill="${t.ink}">${Math.round(p)}<tspan font-size="13" fill="${t.faint}">%</tspan></text>
  ${opts?.label ? `<text x="${cx}" y="${cy + 22}" text-anchor="middle" font-size="11" font-weight="600" fill="${t.faint}">${esc(opts.label)}</text>` : ""}
  ${opts?.sub ? `<text x="${cx}" y="${size - 4}" text-anchor="middle" font-size="9" fill="${t.faint}">${esc(opts.sub)}</text>` : ""}
</svg>`;
}

/** Three gauges side by side in one SVG (device CPU/MEM/DISK). */
export function gaugeRow(
  gauges: Array<{
    pct: number;
    label: string;
    sub?: string;
    color?: Color | string;
  }>,
): string {
  const each = 150;
  const W = each * gauges.length;
  const parts = gauges
    .map((g, i) => {
      const svg = gaugeChart(g.pct, {
        label: g.label,
        sub: g.sub,
        color: g.color,
        size: each,
      });
      const inner = svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
      return `<g transform="translate(${i * each},0)">${inner}</g>`;
    })
    .join("\n  ");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${each}" width="${W}" height="${each}" font-family="${FONT}">
  ${parts}
</svg>`;
}

// ── GitHub-style activity heatmap ───────────────────────────────────────────

export interface HeatDay {
  day: string;
  count: number;
}
export function heatmapChart(
  days: HeatDay[],
  opts?: { color?: Color | string; max?: number },
): string {
  const t = theme();
  const cell = 12;
  const gapc = 3;
  const step = cell + gapc;
  const topPad = 16;
  const leftPad = 26;
  // Bucket days into weeks (columns of 7, Sun→Sat) using their index.
  const max = opts?.max ?? Math.max(1, ...days.map((d) => d.count));
  const base = colorToHex(opts?.color ?? Color.Green);
  const cols = Math.ceil(days.length / 7);
  const W = leftPad + cols * step + 6;
  const H = topPad + 7 * step + 18;

  const level = (c: number): number =>
    c <= 0 ? 0 : Math.min(4, Math.ceil((c / max) * 4));
  const alpha = [0.08, 0.3, 0.5, 0.72, 1];

  const cells = days
    .map((d, i) => {
      const col = Math.floor(i / 7);
      const rowi = i % 7;
      const x = leftPad + col * step;
      const y = topPad + rowi * step;
      const lv = level(d.count);
      const fill = lv === 0 ? t.track : base;
      return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2.5" fill="${fill}" fill-opacity="${alpha[lv]}"><title>${esc(d.day)} · ${d.count}</title></rect>`;
    })
    .join("");

  const wl = ["", "Mon", "", "Wed", "", "Fri", ""]
    .map((lab, i) =>
      lab
        ? `<text x="2" y="${topPad + i * step + cell - 2}" font-size="8" fill="${t.faint}">${lab}</text>`
        : "",
    )
    .join("");

  // legend
  const legY = topPad + 7 * step + 10;
  const legend = `<text x="${leftPad}" y="${legY}" font-size="8.5" fill="${t.faint}">Less</text>${alpha
    .map(
      (al, i) =>
        `<rect x="${leftPad + 30 + i * (cell + 2)}" y="${legY - 9}" width="${cell}" height="${cell}" rx="2.5" fill="${i === 0 ? t.track : base}" fill-opacity="${al}"/>`,
    )
    .join(
      "",
    )}<text x="${leftPad + 30 + alpha.length * (cell + 2) + 4}" y="${legY}" font-size="8.5" fill="${t.faint}">More</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONT}">
  ${wl}
  ${cells}
  ${legend}
</svg>`;
}

// ── tiny inline sparkline for accessory icons ───────────────────────────────

export function sparklineIcon(
  values: Array<number | null | undefined>,
  color: Color | string,
): string {
  const W = 44;
  const H = 18;
  const c = colorToHex(color);
  const present = values.filter(
    (v): v is number => v != null && Number.isFinite(v),
  );
  if (present.length < 2) return "";
  const min = Math.min(...present);
  const max = Math.max(...present);
  const range = max - min || 1;
  const n = values.length;
  const pts: Array<[number, number]> = [];
  values.forEach((v, i) => {
    if (v != null && Number.isFinite(v))
      pts.push([
        2 + (i / (n - 1)) * (W - 4),
        2 + (H - 4) - ((v - min) / range) * (H - 4),
      ]);
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><path d="${smooth(pts)}" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${n2(pts[pts.length - 1][0])}" cy="${n2(pts[pts.length - 1][1])}" r="1.8" fill="${c}"/></svg>`;
  return svgIcon(svg);
}
