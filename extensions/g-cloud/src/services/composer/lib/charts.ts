// Pure SVG chart builders for Raycast Detail / List.Item.Detail markdown images.
// No dependencies; theme-aware palette (dark/light) so charts match Raycast's appearance.

import { formatDuration } from "./format";

export type Theme = "dark" | "light";

const PALETTES = {
  dark: {
    text: "#e6e6e6",
    bg: "#1f1f21",
    mute: "#8f8f8f",
    grid: "#3a3a3a",
    success: "#4ade80",
    failed: "#f87171",
    running: "#60a5fa",
    queued: "#c084fc",
    other: "#9ca3af",
    p50: "#fbbf24",
    p90: "#fb923c",
    bar: "#60a5fa",
    barSoft: "#60a5fa55",
  },
  light: {
    text: "#1f2937",
    bg: "#ffffff",
    mute: "#6b7280",
    grid: "#e5e7eb",
    success: "#16a34a",
    failed: "#dc2626",
    running: "#2563eb",
    queued: "#9333ea",
    other: "#9ca3af",
    p50: "#d97706",
    p90: "#ea580c",
    bar: "#2563eb",
    barSoft: "#2563eb40",
  },
};

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Helvetica, Arial, sans-serif";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function stateColor(p: (typeof PALETTES)["dark"], state?: string | null): string {
  switch (state) {
    case "success":
      return p.success;
    case "failed":
    case "upstream_failed":
      return p.failed;
    case "running":
    case "deferred":
    case "restarting":
      return p.running;
    case "queued":
    case "scheduled":
    case "up_for_retry":
    case "up_for_reschedule":
      return p.queued;
    default:
      return p.other;
  }
}

function svg(width: number, height: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${FONT}">${body}</svg>`;
}

/** "Nice" axis ticks for durations in seconds. */
function durationTicks(max: number): number[] {
  const steps = [5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 10800, 21600];
  const step = steps.find((s) => max / s <= 4) ?? Math.ceil(max / 4 / 3600) * 3600;
  const out: number[] = [];
  for (let v = step; v <= max * 1.001; v += step) out.push(v);
  return out;
}

export interface DurationBar {
  seconds?: number; // undefined = not finished
  state?: string | null;
  label?: string; // x label (shown for first/last)
}

/**
 * Vertical bar chart of durations (one bar per run/attempt), colored by state, with p50 and p90
 * reference lines. Bars are oldest -> newest left to right.
 */
export function durationChart(
  bars: DurationBar[],
  opts: { theme: Theme; width?: number; height?: number; p50?: number; p90?: number; title?: string },
): string {
  const p = PALETTES[opts.theme];
  const W = opts.width ?? 720;
  const H = opts.height ?? 240;
  const left = 56;
  const right = 12;
  const top = opts.title ? 30 : 12;
  const bottom = 26;
  const plotW = W - left - right;
  const plotH = H - top - bottom;
  const vals = bars.map((b) => b.seconds ?? 0);
  const max = Math.max(1, ...vals, opts.p90 ?? 0) * 1.08;
  const y = (v: number) => top + plotH - (v / max) * plotH;
  const n = Math.max(1, bars.length);
  const slot = plotW / n;
  const bw = Math.max(2, Math.min(28, slot * 0.72));
  let body = "";
  if (opts.title)
    body += `<text x="${left}" y="18" font-size="13" font-weight="600" fill="${p.text}">${esc(opts.title)}</text>`;
  for (const t of durationTicks(max)) {
    const yy = y(t).toFixed(1);
    body += `<line x1="${left}" x2="${W - right}" y1="${yy}" y2="${yy}" stroke="${p.grid}" stroke-width="1"/>`;
    body += `<text x="${left - 6}" y="${Number(yy) + 4}" font-size="10" text-anchor="end" fill="${p.mute}">${esc(
      formatDuration(t),
    )}</text>`;
  }
  body += `<line x1="${left}" x2="${W - right}" y1="${top + plotH}" y2="${top + plotH}" stroke="${
    p.grid
  }" stroke-width="1"/>`;
  bars.forEach((b, i) => {
    const x = left + i * slot + (slot - bw) / 2;
    if (b.seconds === undefined) {
      body += `<rect x="${x.toFixed(1)}" y="${top + plotH - 3}" width="${bw.toFixed(
        1,
      )}" height="3" rx="1" fill="${stateColor(p, b.state)}" opacity="0.7"/>`;
      return;
    }
    const yy = y(b.seconds);
    const h = Math.max(1.5, top + plotH - yy);
    body += `<rect x="${x.toFixed(1)}" y="${yy.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(
      1,
    )}" rx="${Math.min(3, bw / 3).toFixed(1)}" fill="${stateColor(p, b.state)}"/>`;
  });
  const ref = (v: number | undefined, color: string, name: string) => {
    if (v === undefined || !Number.isFinite(v)) return;
    const yy = y(v).toFixed(1);
    body += `<line x1="${left}" x2="${
      W - right
    }" y1="${yy}" y2="${yy}" stroke="${color}" stroke-width="1.5" stroke-dasharray="5 4"/>`;
    const label = `${name} ${formatDuration(v)}`;
    const lw = label.length * 6 + 8;
    body += `<rect x="${(W - right - lw).toFixed(1)}" y="${(Number(yy) - 15).toFixed(
      1,
    )}" width="${lw}" height="14" rx="3" fill="${p.bg}" opacity="0.9"/>`;
    body += `<text x="${W - right - 4}" y="${
      Number(yy) - 4
    }" font-size="10" font-weight="600" text-anchor="end" fill="${color}">${esc(label)}</text>`;
  };
  ref(opts.p90, p.p90, "p90");
  ref(opts.p50, p.p50, "p50");
  const first = bars[0]?.label;
  const last = bars[bars.length - 1]?.label;
  if (first) body += `<text x="${left}" y="${H - 8}" font-size="10" fill="${p.mute}">${esc(first)}</text>`;
  if (last)
    body += `<text x="${W - right}" y="${H - 8}" font-size="10" text-anchor="end" fill="${p.mute}">${esc(last)}</text>`;
  return svg(W, H, body);
}

export interface TaskTiming {
  name: string;
  p50?: number;
  p90?: number;
  max?: number;
  failed?: number;
  flagged?: boolean;
}

/**
 * Horizontal "where does the time go" chart: per task a solid p50 bar, a translucent extension
 * to p90 and a tick at max. Sorted by caller.
 */
export function taskTimingChart(rows: TaskTiming[], opts: { theme: Theme; width?: number; title?: string }): string {
  const p = PALETTES[opts.theme];
  const W = opts.width ?? 720;
  const rowH = 22;
  const top = opts.title ? 30 : 8;
  const labelW = 230;
  const valueW = 160;
  const plotX = labelW + 8;
  const plotW = W - plotX - valueW;
  const H = top + rows.length * rowH + 22;
  const max = Math.max(1, ...rows.map((r) => r.max ?? r.p90 ?? r.p50 ?? 0));
  const x = (v: number) => plotX + (v / max) * plotW;
  let body = "";
  if (opts.title)
    body += `<text x="0" y="18" font-size="13" font-weight="600" fill="${p.text}">${esc(opts.title)}</text>`;
  rows.forEach((r, i) => {
    const yy = top + i * rowH;
    const name = r.name.length > 34 ? `${r.name.slice(0, 33)}…` : r.name;
    const color = r.failed ? p.failed : r.flagged ? p.p90 : p.bar;
    body += `<text x="${labelW}" y="${yy + 15}" font-size="11" text-anchor="end" fill="${p.text}">${esc(name)}</text>`;
    body += `<rect x="${plotX}" y="${yy + 4}" width="${plotW}" height="14" rx="3" fill="${p.grid}" opacity="0.35"/>`;
    if (r.p90 !== undefined)
      body += `<rect x="${plotX}" y="${yy + 4}" width="${Math.max(1, x(r.p90) - plotX).toFixed(
        1,
      )}" height="14" rx="3" fill="${color}" opacity="0.35"/>`;
    if (r.p50 !== undefined)
      body += `<rect x="${plotX}" y="${yy + 4}" width="${Math.max(1, x(r.p50) - plotX).toFixed(
        1,
      )}" height="14" rx="3" fill="${color}"/>`;
    if (r.max !== undefined)
      body += `<line x1="${x(r.max).toFixed(1)}" x2="${x(r.max).toFixed(1)}" y1="${yy + 2}" y2="${yy + 20}" stroke="${
        p.mute
      }" stroke-width="1.5"/>`;
    const v = r.p50 === undefined ? "–" : `${formatDuration(r.p50)} / ${formatDuration(r.p90)}`;
    body += `<text x="${W}" y="${yy + 15}" font-size="11" text-anchor="end" fill="${
      r.failed ? p.failed : p.mute
    }">${esc(v)}${r.failed ? ` · ${r.failed}✗` : ""}</text>`;
  });
  const ly = top + rows.length * rowH + 14;
  body += `<rect x="${plotX}" y="${ly - 8}" width="14" height="8" rx="2" fill="${p.bar}"/><text x="${
    plotX + 18
  }" y="${ly}" font-size="10" fill="${p.mute}">p50</text>`;
  body += `<rect x="${plotX + 50}" y="${ly - 8}" width="14" height="8" rx="2" fill="${
    p.bar
  }" opacity="0.35"/><text x="${plotX + 68}" y="${ly}" font-size="10" fill="${p.mute}">to p90</text>`;
  body += `<line x1="${plotX + 118}" x2="${plotX + 118}" y1="${ly - 9}" y2="${ly + 1}" stroke="${
    p.mute
  }" stroke-width="1.5"/><text x="${plotX + 124}" y="${ly}" font-size="10" fill="${p.mute}">max</text>`;
  body += `<text x="${W}" y="${ly}" font-size="10" text-anchor="end" fill="${p.mute}">p50 / p90</text>`;
  return svg(W, H, body);
}

/**
 * Airflow-style grid: rows = tasks, columns = runs (oldest -> newest), cell color = state.
 * `cells[row][col]` is a state string or undefined (task absent in that run).
 */
export function stateGrid(
  rowNames: string[],
  cells: (string | undefined)[][],
  opts: { theme: Theme; width?: number; title?: string; colLabels?: [string, string] },
): string {
  const p = PALETTES[opts.theme];
  const W = opts.width ?? 720;
  const labelW = 230;
  const top = opts.title ? 30 : 8;
  const cols = Math.max(1, ...cells.map((r) => r.length));
  const cw = Math.min(16, (W - labelW - 12) / cols);
  const ch = 14;
  const H = top + rowNames.length * (ch + 4) + 22;
  let body = "";
  if (opts.title)
    body += `<text x="0" y="18" font-size="13" font-weight="600" fill="${p.text}">${esc(opts.title)}</text>`;
  rowNames.forEach((name, i) => {
    const yy = top + i * (ch + 4);
    const n = name.length > 34 ? `${name.slice(0, 33)}…` : name;
    body += `<text x="${labelW}" y="${yy + 11}" font-size="11" text-anchor="end" fill="${p.text}">${esc(n)}</text>`;
    cells[i].forEach((st, j) => {
      const x = labelW + 8 + j * cw;
      body += st
        ? `<rect x="${x.toFixed(1)}" y="${yy}" width="${(cw - 2).toFixed(1)}" height="${ch}" rx="2" fill="${stateColor(
            p,
            st,
          )}"/>`
        : `<rect x="${x.toFixed(1)}" y="${yy}" width="${(cw - 2).toFixed(1)}" height="${ch}" rx="2" fill="${
            p.grid
          }" opacity="0.4"/>`;
    });
  });
  const ly = top + rowNames.length * (ch + 4) + 14;
  if (opts.colLabels) {
    body += `<text x="${labelW + 8}" y="${ly}" font-size="10" fill="${p.mute}">${esc(opts.colLabels[0])}</text>`;
    body += `<text x="${labelW + 8 + cols * cw}" y="${ly}" font-size="10" text-anchor="end" fill="${p.mute}">${esc(
      opts.colLabels[1],
    )}</text>`;
  }
  const legend: [string, string][] = [
    ["success", p.success],
    ["failed", p.failed],
    ["running", p.running],
    ["queued/retry", p.queued],
    ["skipped/other", p.other],
  ];
  let lx = labelW + 8;
  const legendY = ly + 18;
  legend.forEach(([t, c]) => {
    body += `<rect x="${lx}" y="${legendY - 8}" width="10" height="10" rx="2" fill="${c}"/><text x="${
      lx + 14
    }" y="${legendY}" font-size="10" fill="${p.mute}">${t}</text>`;
    lx += 14 + t.length * 6 + 12;
  });
  return svg(W, H + 22, body);
}
