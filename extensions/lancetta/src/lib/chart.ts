import type { Point } from "./history";

/**
 * One quota window from its opening to its reset, as Lancetta's panel draws it: what went
 * (a step line over a soft fill), now, last week's line dotted, and -- when Lancetta says the
 * pace runs out -- the last hour's rate carried forward to the stop, then the stretch the
 * agent would be stopped for, hatched in amber.
 *
 * Paths and lines only: Raycast's SVG renderer has been reported to skip `<circle>`, and
 * nothing here relies on patterns or clip paths.
 */
export type ChartInput = {
  opensAt: number;
  resetsAt: number;
  now: number;
  points: Point[];
  lastWeek: Point[];
  /** When the current pace reaches 100%: strictly between now and the reset, or null. */
  stopAt: number | null;
  tint: string;
  dark: boolean;
};

const W = 640;
const H = 290;
// the bottom holds the day labels, then the legend
const PAD = { left: 10, right: 10, top: 14, bottom: 72 };
// Raycast scales the 640-wide drawing down to the pane, so text is drawn large: 18 px here is ~11 pt there
export const FONT_SIZE = 18;
export const AMBER = "#F5A623";

export function chartSVG(input: ChartInput): string {
  const { opensAt, resetsAt, now, points, lastWeek, stopAt, tint, dark } = input;
  const ink = dark ? "#FFFFFF" : "#000000";
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (t: number) => PAD.left + ((t - opensAt) / (resetsAt - opensAt)) * plotW;
  const y = (used: number) => PAD.top + (1 - Math.min(100, Math.max(0, used)) / 100) * plotH;
  const bottom = PAD.top + plotH;
  const span = resetsAt - opensAt;
  const parts: string[] = [];

  // the plot's ground
  parts.push(rect(PAD.left, PAD.top, plotW, plotH, ink, 0.05, 6));

  // a faint line and a label at every local midnight (a 5-hour window gets every hour)
  const step = span > 86400 ? 86400 : 3600;
  for (const t of ticks(opensAt, resetsAt, step)) {
    parts.push(line(x(t), PAD.top, x(t), bottom, ink, 0.08, 1));
    const label =
      step === 86400
        ? new Date(t * 1000).toLocaleDateString(undefined, { weekday: "short" })
        : new Date(t * 1000).toLocaleTimeString(undefined, { hour: "numeric" });
    parts.push(text(x(t) + 4, bottom + 24, label, ink, 0.45));
  }

  // the limit
  parts.push(line(PAD.left, y(100), PAD.left + plotW, y(100), tint, 0.6, 1.5, "6 5"));

  // last week, dotted: already moved onto this window by its caller (`previousSeries`), and
  // kept inside it, since a moved reset can leave a reading just before the opening
  const lastInside = lastWeek.filter((p) => p.at >= opensAt && p.at <= resetsAt);
  if (lastInside.length > 1) {
    parts.push(path(stepPath(lastInside, x, y), ink, 0.35, 2, "2 5"));
  }

  // so far: a soft fill under a step line
  if (points.length > 0) {
    const steps = stepPath([...points, { at: now, used: points[points.length - 1].used }], x, y);
    parts.push(
      `<path d="${steps} L${f(x(now))},${f(bottom)} L${f(x(points[0].at))},${f(bottom)} Z" fill="${tint}" fill-opacity="0.22" stroke="none"/>`,
    );
    parts.push(path(steps, tint, 1, 2.5));
  }

  // the projection: the last hour's rate to the stop, then the stopped stretch
  const current = points.length > 0 ? points[points.length - 1].used : null;
  const projected = stopAt !== null && current !== null;
  if (stopAt !== null && current !== null) {
    parts.push(line(x(now), y(current), x(stopAt), y(100), tint, 1, 2.5, "7 5"));
    parts.push(hatch(x(stopAt), PAD.top, x(resetsAt) - x(stopAt), plotH));
  }

  // now
  parts.push(line(x(now), PAD.top, x(now), bottom, ink, 0.45, 1.5));
  if (current !== null) parts.push(dot(x(now), y(current), tint, ink));

  // the legend, with the same strokes the plot uses: markdown has no glyph for a dotted line
  const keys = [
    { label: "so far", stroke: tint, opacity: 1, width: 2.5, dash: undefined, shown: true },
    { label: "at this pace", stroke: tint, opacity: 1, width: 2.5, dash: "7 5", shown: projected },
    { label: "last week", stroke: ink, opacity: 0.5, width: 2, dash: "2 5", shown: lastInside.length > 1 },
  ];
  let lx = PAD.left;
  const ly = bottom + 60;
  for (const key of keys.filter((k) => k.shown)) {
    parts.push(line(lx, ly - 6, lx + 24, ly - 6, key.stroke, key.opacity, key.width, key.dash));
    parts.push(text(lx + 34, ly, key.label, ink, 0.6));
    lx += 34 + key.label.length * FONT_SIZE * 0.55 + 28; // an estimate of the text's width
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join("")}</svg>`;
}

/** A markdown image Raycast renders: the SVG inline, scaled to `width` points with its own proportions. */
export function svgImage(svg: string, width: number, viewW: number, viewH: number): string {
  const height = Math.round((width * viewH) / viewW);
  return `![](data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}?raycast-width=${width}&raycast-height=${height})`;
}

/** The window chart at a size the side pane fits. */
export const chartMarkdownImage = (svg: string, width = 420) => svgImage(svg, width, W, H);

function stepPath(points: Point[], x: (t: number) => number, y: (u: number) => number): string {
  let d = `M${f(x(points[0].at))},${f(y(points[0].used))}`;
  for (let i = 1; i < points.length; i++) {
    d += ` H${f(x(points[i].at))} V${f(y(points[i].used))}`;
  }
  return d;
}

function ticks(from: number, to: number, step: number): number[] {
  const out: number[] = [];
  const first = new Date(from * 1000);
  if (step === 86400) first.setHours(24, 0, 0, 0);
  else first.setMinutes(60, 0, 0);
  for (let t = first.getTime() / 1000; t < to; t += step) out.push(t);
  return out;
}

/** Amber diagonals over a faint amber ground, each one cut to the box by hand. */
function hatch(x0: number, y0: number, w: number, h: number): string {
  if (w <= 0) return "";
  const out = [rect(x0, y0, w, h, AMBER, 0.12, 0)];
  const gap = 11;
  for (let start = x0 - h; start < x0 + w; start += gap) {
    // the line from (start, y0 + h) up to (start + h, y0), clipped to [x0, x0 + w]
    const ax = Math.max(start, x0);
    const bx = Math.min(start + h, x0 + w);
    if (bx <= ax) continue;
    out.push(line(ax, y0 + h - (ax - start), bx, y0 + h - (bx - start), AMBER, 0.75, 2));
  }
  return out.join("");
}

function dot(cx: number, cy: number, fill: string, ring: string): string {
  const circle = (r: number) => `M${f(cx - r)},${f(cy)} a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 ${-r * 2},0`;
  return `<path d="${circle(7.5)}" fill="${ring}" fill-opacity="0.9"/><path d="${circle(5.5)}" fill="${fill}"/>`;
}

export const f = (n: number) => n.toFixed(1);

export const rect = (x: number, y: number, w: number, h: number, fill: string, opacity: number, r: number) =>
  `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${r}" fill="${fill}" fill-opacity="${opacity}"/>`;

export const line = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  stroke: string,
  opacity: number,
  width: number,
  dash?: string,
) =>
  `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${stroke}" stroke-opacity="${opacity}" stroke-width="${width}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;

const path = (d: string, stroke: string, opacity: number, width: number, dash?: string) =>
  `<path d="${d}" fill="none" stroke="${stroke}" stroke-opacity="${opacity}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;

export const text = (
  x: number,
  y: number,
  value: string,
  fill: string,
  opacity: number,
  size = FONT_SIZE,
  anchor = "start",
) =>
  `<text x="${f(x)}" y="${f(y)}" font-family="-apple-system, Helvetica, sans-serif" font-size="${size}" text-anchor="${anchor}" fill="${fill}" fill-opacity="${opacity}">${value}</text>`;
