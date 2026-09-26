import { Severity } from "../analysis/severity";
import { THRESHOLDS } from "../analysis/thresholds";

export type ChartPoint = { t: number; w: number };

const PALETTE = {
  light: { text: "#1C1C1E", muted: "#8E8E93", grid: "#E5E5EA" },
  dark: { text: "#F2F2F7", muted: "#8E8E93", grid: "#3A3A3C" },
};

// Apple system colors, light and dark variants: green, yellow, orange, red.
const TONES: Record<"light" | "dark", Record<Severity, string>> = {
  light: { low: "#34C759", moderate: "#FFCC00", high: "#FF9500", critical: "#FF3B30" },
  dark: { low: "#30D158", moderate: "#FFD60A", high: "#FF9F0A", critical: "#FF453A" },
};

/**
 * Height for a chart that is a detail's whole markdown. With metadata under it, Raycast gives the
 * markdown the top half of the detail; the chart scales to the width, so 640×280 fills that half.
 */
export const DETAIL_CHART_HEIGHT = 280;

export type ChartOptions = { unit?: "W" | "%"; width?: number; height?: number; tone?: Severity };

// Text sizes in chart units; Raycast scales the 640-wide chart to the detail's width (about 1.25×).
const FONT = { axis: 13, peak: 15, placeholder: 16 };

/** Axis label for a value: "12 W" for watts, "28%" for CPU. */
const label = (n: number, unit: "W" | "%") => (unit === "W" ? `${Math.round(n)} W` : `${Math.round(n)}%`);

export function chartSvg(points: ChartPoint[], appearance: "light" | "dark", options: ChartOptions = {}): string {
  const { unit = "W", width = 640, height = 220, tone = "high" } = options;
  const c = { ...PALETTE[appearance], accent: TONES[appearance][tone] };
  // The left margin holds the axis labels, so the line never runs over them. The top margin and the
  // 15% headroom above the peak leave room for the peak's label.
  const pad = { top: 24, right: 12, bottom: 28, left: 54 };
  const open = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="-apple-system, BlinkMacSystemFont, sans-serif">`;

  if (points.length < 2) {
    return `${open}<text x="${width / 2}" y="${height / 2}" text-anchor="middle" font-size="${FONT.placeholder}" fill="${c.muted}">Collecting data…</text></svg>`;
  }

  const t0 = points[0].t;
  const t1 = points[points.length - 1].t;
  const peak = Math.max(...points.map((p) => p.w));
  const peakPoint = points.find((p) => p.w === peak) ?? points[0];
  const yMax = Math.max(peak * 1.15, 1);
  const x = (t: number) => pad.left + ((t - t0) / Math.max(t1 - t0, 1)) * (width - pad.left - pad.right);
  const y = (w: number) => pad.top + (1 - w / yMax) * (height - pad.top - pad.bottom);
  const f = (n: number) => n.toFixed(1);

  // A gap longer than maxGapMs means nothing was measured (sleep, or the menu bar not running): the
  // solid line and its fill stop there, and a faint dashed line bridges the gap, so the chart reads as
  // one line without claiming readings it does not have.
  const segments: ChartPoint[][] = [];
  for (const [i, p] of points.entries()) {
    if (i === 0 || p.t - points[i - 1].t > THRESHOLDS.maxGapMs) segments.push([]);
    segments[segments.length - 1].push(p);
  }
  const drawn = segments.filter((seg) => seg.length > 1);
  const segLine = (seg: ChartPoint[]) => seg.map((p, i) => `${i === 0 ? "M" : "L"}${f(x(p.t))} ${f(y(p.w))}`).join(" ");
  const line = drawn.map(segLine).join(" ");
  const baseline = f(y(0));
  const area = drawn
    .map((seg) => `${segLine(seg)} L${f(x(seg[seg.length - 1].t))} ${baseline} L${f(x(seg[0].t))} ${baseline} Z`)
    .join(" ");
  // A reading with no neighbours has no solid line, but the bridges on both sides meet at it.
  const bridges = segments
    .slice(1)
    .map((seg, i) => {
      const from = segments[i][segments[i].length - 1];
      return `M${f(x(from.t))} ${f(y(from.w))} L${f(x(seg[0].t))} ${f(y(seg[0].w))}`;
    })
    .join(" ");
  const gap = bridges
    ? `<path class="gap" d="${bridges}" fill="none" stroke="${c.accent}" stroke-opacity="0.6" stroke-width="1.5" stroke-dasharray="5 5"/>`
    : "";
  const grid = [0.25, 0.5, 0.75]
    .map((r) => {
      const gy = f(y(yMax * r));
      return (
        `<line x1="${pad.left}" x2="${width - pad.right}" y1="${gy}" y2="${gy}" stroke="${c.grid}" stroke-width="1"/>` +
        `<text x="${pad.left - 8}" y="${f(y(yMax * r) + 4)}" text-anchor="end" font-size="${FONT.axis}" fill="${c.muted}">${label(yMax * r, unit)}</text>`
      );
    })
    .join("");
  const spanMin = Math.round((t1 - t0) / 60_000);
  const last = points[points.length - 1];
  const start = new Date(t0);
  const hhmm = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
  const axisY = height - 6;
  // The peak is labelled where it happened; near an edge the label turns inward so it stays visible.
  const px = x(peakPoint.t);
  const py = y(peakPoint.w);
  const edge = 48;
  const [anchor, lx] =
    px > width - pad.right - edge ? ["end", px - 8] : px < pad.left + edge ? ["start", px + 8] : ["middle", px];

  return [
    open,
    grid,
    `<path class="area" d="${area}" fill="${c.accent}" fill-opacity="0.18"/>`,
    `<path class="line" d="${line}" fill="none" stroke="${c.accent}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`,
    gap,
    `<circle cx="${f(x(last.t))}" cy="${f(y(last.w))}" r="4" fill="${c.accent}"/>`,
    `<circle class="peak" cx="${f(px)}" cy="${f(py)}" r="3.5" fill="none" stroke="${c.text}" stroke-width="1.5"/>`,
    `<text x="${f(lx)}" y="${f(py - 10)}" text-anchor="${anchor}" class="peak-label" font-size="${FONT.peak}" font-weight="600" fill="${c.text}">${label(peak, unit)}</text>`,
    `<text x="${pad.left}" y="${axisY}" font-size="${FONT.axis}" fill="${c.muted}">${hhmm}</text>`,
    `<text x="${width / 2}" y="${axisY}" text-anchor="middle" font-size="${FONT.axis}" fill="${c.muted}">last ${spanMin} min</text>`,
    `<text x="${width - pad.right}" y="${axisY}" text-anchor="end" font-size="${FONT.axis}" fill="${c.muted}">now</text>`,
    "</svg>",
  ].join("");
}
