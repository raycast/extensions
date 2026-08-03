/**
 * Hand-rolled SVG chart. No chart library, no external fetches — Raycast renders
 * the markup straight from a data URI.
 *
 * Colours are picked to stay legible on both the light and dark Raycast themes,
 * since a markdown image cannot respond to the theme.
 */
import { DOW_NAMES } from "./forecast";
import { Forecast, ForecastPoint } from "./types";

const W = 760;
const H = 300;
// Extra top padding keeps the legend clear of the curve, which always ends high.
const PAD = { top: 34, right: 18, bottom: 30, left: 38 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const COLOR = {
  grid: "#8a8a8e",
  axis: "#8a8a8e",
  actual: "#3b82f6",
  forecast: "#f59e0b",
  limit: "#ef4444",
  weekend: "#8a8a8e",
  sample: "#2563eb",
  now: "#8a8a8e",
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildChartSvg(f: Forecast): string {
  const t0 = f.windowStart;
  const t1 = f.windowEnd;
  const span = Math.max(1, t1 - t0);
  const yMax = Math.max(
    105,
    Math.ceil((Math.max(f.pctAtReset, f.pctNow) * 1.08) / 10) * 10,
  );

  const x = (t: number) => PAD.left + ((t - t0) / span) * PLOT_W;
  const y = (pct: number) =>
    PAD.top + PLOT_H - (Math.min(pct, yMax) / yMax) * PLOT_H;

  const path = (pts: ForecastPoint[]) =>
    pts.length === 0
      ? ""
      : pts
          .map(
            (p, i) =>
              `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)},${y(p.pct).toFixed(1)}`,
          )
          .join(" ");

  const parts: string[] = [];

  // Weekend bands + one vertical gridline and label per local day.
  const dayStart = new Date(t0);
  dayStart.setHours(0, 0, 0, 0);
  for (let d = dayStart.getTime(); d < t1 + 86_400_000; d += 86_400_000) {
    const dow = new Date(d).getDay();
    const left = Math.max(t0, d);
    const right = Math.min(t1, d + 86_400_000);
    if (right <= left) continue;
    if (dow === 0 || dow === 6) {
      parts.push(
        `<rect x="${x(left).toFixed(1)}" y="${PAD.top}" width="${(x(right) - x(left)).toFixed(1)}" height="${PLOT_H}" fill="${COLOR.weekend}" opacity="0.10"/>`,
      );
    }
    if (d >= t0 && d <= t1) {
      parts.push(
        `<line x1="${x(d).toFixed(1)}" y1="${PAD.top}" x2="${x(d).toFixed(1)}" y2="${PAD.top + PLOT_H}" stroke="${COLOR.grid}" stroke-width="1" opacity="0.25"/>`,
      );
    }
    const mid = (Math.max(t0, d) + Math.min(t1, d + 86_400_000)) / 2;
    if (mid > t0 && mid < t1) {
      parts.push(
        `<text x="${x(mid).toFixed(1)}" y="${(PAD.top + PLOT_H + 18).toFixed(1)}" fill="${COLOR.axis}" font-size="11" font-family="-apple-system,system-ui,sans-serif" text-anchor="middle" opacity="0.85">${DOW_NAMES[dow]}</text>`,
      );
    }
  }

  // Horizontal gridlines every 20%.
  for (let p = 0; p <= yMax; p += 20) {
    parts.push(
      `<line x1="${PAD.left}" y1="${y(p).toFixed(1)}" x2="${PAD.left + PLOT_W}" y2="${y(p).toFixed(1)}" stroke="${COLOR.grid}" stroke-width="1" opacity="0.2"/>`,
      `<text x="${PAD.left - 6}" y="${(y(p) + 4).toFixed(1)}" fill="${COLOR.axis}" font-size="11" font-family="-apple-system,system-ui,sans-serif" text-anchor="end" opacity="0.85">${p}</text>`,
    );
  }

  // The limit.
  parts.push(
    `<line x1="${PAD.left}" y1="${y(100).toFixed(1)}" x2="${PAD.left + PLOT_W}" y2="${y(100).toFixed(1)}" stroke="${COLOR.limit}" stroke-width="1.5" stroke-dasharray="2 3" opacity="0.9"/>`,
  );

  // Area under the actual curve, then the curves themselves.
  if (f.actual.length > 1) {
    const area = `${path(f.actual)} L${x(f.actual[f.actual.length - 1].t).toFixed(1)},${y(0).toFixed(1)} L${x(f.actual[0].t).toFixed(1)},${y(0).toFixed(1)} Z`;
    parts.push(`<path d="${area}" fill="${COLOR.actual}" opacity="0.13"/>`);
    parts.push(
      `<path d="${path(f.actual)}" fill="none" stroke="${COLOR.actual}" stroke-width="2.2" stroke-linejoin="round"/>`,
    );
  }
  if (f.projected.length > 1) {
    parts.push(
      `<path d="${path(f.projected)}" fill="none" stroke="${COLOR.forecast}" stroke-width="2.2" stroke-dasharray="5 4" stroke-linejoin="round"/>`,
    );
  }

  // Real sampled observations, so a drifting reconstruction is visible.
  for (const s of f.samples) {
    parts.push(
      `<circle cx="${x(s.t).toFixed(1)}" cy="${y(s.weekly).toFixed(1)}" r="1.9" fill="${COLOR.sample}" opacity="0.65"/>`,
    );
  }

  // "Now" marker.
  const now = Date.now();
  if (now > t0 && now < t1) {
    parts.push(
      `<line x1="${x(now).toFixed(1)}" y1="${PAD.top}" x2="${x(now).toFixed(1)}" y2="${PAD.top + PLOT_H}" stroke="${COLOR.now}" stroke-width="1" stroke-dasharray="3 3" opacity="0.6"/>`,
      `<circle cx="${x(now).toFixed(1)}" cy="${y(f.pctNow).toFixed(1)}" r="3.6" fill="${COLOR.actual}"/>`,
      `<text x="${x(now).toFixed(1)}" y="${(y(f.pctNow) - 9).toFixed(1)}" fill="${COLOR.actual}" font-size="12" font-weight="600" font-family="-apple-system,system-ui,sans-serif" text-anchor="middle">${f.pctNow.toFixed(0)}%</text>`,
    );
  }

  // Predicted crossing.
  if (f.hitsLimitAt !== null && f.hitsLimitAt > now && f.hitsLimitAt < t1) {
    const hx = x(f.hitsLimitAt);
    const label = new Date(f.hitsLimitAt).toLocaleString(undefined, {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    const anchor = hx > PAD.left + PLOT_W - 90 ? "end" : "start";
    const dx = anchor === "end" ? -6 : 6;
    parts.push(
      `<circle cx="${hx.toFixed(1)}" cy="${y(100).toFixed(1)}" r="4" fill="${COLOR.limit}"/>`,
      `<text x="${(hx + dx).toFixed(1)}" y="${(y(100) - 14).toFixed(1)}" fill="${COLOR.limit}" font-size="12" font-weight="600" font-family="-apple-system,system-ui,sans-serif" text-anchor="${anchor}">${esc(label)}</text>`,
    );
  }

  // Legend, above the plot area so it never sits under the curve.
  const legend = [
    { c: COLOR.actual, t: "actual", dash: "" },
    { c: COLOR.forecast, t: "forecast", dash: ' stroke-dasharray="5 4"' },
    { c: COLOR.limit, t: "limit", dash: ' stroke-dasharray="2 3"' },
  ];
  const ly = PAD.top - 14;
  let lx = PAD.left;
  for (const l of legend) {
    parts.push(
      `<line x1="${lx}" y1="${ly}" x2="${lx + 16}" y2="${ly}" stroke="${l.c}" stroke-width="2.2"${l.dash}/>`,
      `<text x="${lx + 21}" y="${ly + 4}" fill="${COLOR.axis}" font-size="11" font-family="-apple-system,system-ui,sans-serif">${l.t}</text>`,
    );
    lx += 21 + l.t.length * 6.2 + 14;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><g>${parts.join("")}</g></svg>`;
}

export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

const BLOCKS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

/** Fallback (and menu-bar) renderer: cumulative percentage as unicode blocks. */
export function sparkline(
  points: ForecastPoint[],
  buckets = 28,
  max = 100,
): string {
  if (points.length === 0) return "";
  const t0 = points[0].t;
  const t1 = points[points.length - 1].t;
  const span = Math.max(1, t1 - t0);
  const out: string[] = [];
  for (let i = 0; i < buckets; i++) {
    const target = t0 + (span * (i + 1)) / buckets;
    let pct = points[0].pct;
    for (const p of points) {
      if (p.t <= target) pct = p.pct;
      else break;
    }
    const idx = Math.max(
      0,
      Math.min(
        BLOCKS.length - 1,
        Math.round((pct / max) * (BLOCKS.length - 1)),
      ),
    );
    out.push(BLOCKS[idx]);
  }
  return out.join("");
}

/**
 * A fixed-width bar for the detail view's per-day table. Kept short: a markdown
 * table column in Raycast's detail pane wraps well before 18 glyphs.
 */
export function bar(value: number, max: number, width = 10): string {
  if (max <= 0) return "░".repeat(width);
  const filled = Math.max(
    0,
    Math.min(width, Math.round((value / max) * width)),
  );
  return "█".repeat(filled) + "░".repeat(width - filled);
}
