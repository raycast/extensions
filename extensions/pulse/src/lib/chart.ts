// Today's line as an SVG, for the detail pane's markdown.
import { formatAxis } from "./format";
import type { Point } from "./quotes";

export interface ChartOptions {
  series: Point[];
  /** The previous close, drawn as a dashed line the price is measured against. */
  reference: number | null;
  /** The span of the x-axis; a session still under way leaves the rest of the day empty. */
  window: [number, number] | null;
  appearance: "light" | "dark";
  /** Formats an axis time. */
  time: (timestamp: number) => string;
}

const WIDTH = 800;
const HEIGHT = 290;
const PLOT = { left: 8, right: 110, top: 16, bottom: 46 };

const COLORS = {
  light: { up: "#1A8F4C", down: "#D93A40", grid: "#D7DCE3", text: "#5B6573", reference: "#8A94A3" },
  dark: { up: "#3DD27A", down: "#FF6369", grid: "#2F3540", text: "#9AA4B2", reference: "#7C8696" },
};

const round = (value: number) => Math.round(value * 10) / 10;
const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Null when there are fewer than two points to draw. */
export function chartSvg(options: ChartOptions): string | null {
  const { series, reference, appearance } = options;
  if (series.length < 2) return null;
  const colors = COLORS[appearance];
  const last = series[series.length - 1].price;
  const rising = reference ? last >= reference : last >= series[0].price;
  const line = rising ? colors.up : colors.down;

  const prices = series.map((point) => point.price);
  const values = reference ? [...prices, reference] : prices;
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (max - min < max * 1e-9) {
    min -= 1;
    max += 1;
  }
  const padding = (max - min) * 0.08;
  min -= padding;
  max += padding;

  const start = options.window?.[0] ?? series[0].time;
  let end = options.window?.[1] ?? series[series.length - 1].time;
  if (end <= start) end = start + 1;
  const plotWidth = WIDTH - PLOT.left - PLOT.right;
  const plotHeight = HEIGHT - PLOT.top - PLOT.bottom;
  const x = (time: number) => round(PLOT.left + Math.min(Math.max((time - start) / (end - start), 0), 1) * plotWidth);
  const y = (price: number) => round(PLOT.top + (1 - (price - min) / (max - min)) * plotHeight);

  // A lunch break (Hong Kong, Shanghai, Tokyo) is a gap in the line, not a straight bridge across it.
  const steps = series
    .slice(1)
    .map((point, index) => point.time - series[index].time)
    .sort((a, b) => a - b);
  const gap = Math.max(3 * steps[Math.floor(steps.length / 2)], 10 * 60_000);
  const segments: Point[][] = [[series[0]]];
  for (let index = 1; index < series.length; index += 1) {
    if (series[index].time - series[index - 1].time > gap) segments.push([]);
    segments[segments.length - 1].push(series[index]);
  }
  const floor = PLOT.top + plotHeight;
  const trace = (segment: Point[]) =>
    segment.map((point, index) => `${index ? "L" : "M"}${x(point.time)},${y(point.price)}`).join(" ");
  const path = segments.map(trace).join(" ");
  const area = segments
    .filter((segment) => segment.length > 1)
    .map(
      (segment) =>
        `${trace(segment)} L${x(segment[segment.length - 1].time)},${floor} L${x(segment[0].time)},${floor} Z`,
    )
    .join(" ");
  const high = Math.max(...prices);
  const low = Math.min(...prices);
  const labelX = WIDTH - PLOT.right + 14;
  const font = `font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="20"`;

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">`,
    `<defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">`,
    `<stop offset="0" stop-color="${line}" stop-opacity="0.28"/><stop offset="1" stop-color="${line}" stop-opacity="0"/>`,
    `</linearGradient></defs>`,
    `<line x1="${PLOT.left}" y1="${floor}" x2="${WIDTH - PLOT.right}" y2="${floor}" stroke="${colors.grid}" stroke-width="2"/>`,
    `<path d="${area}" fill="url(#fill)"/>`,
  ];
  if (reference) {
    const ry = y(reference);
    parts.push(
      `<line x1="${PLOT.left}" y1="${ry}" x2="${WIDTH - PLOT.right}" y2="${ry}" stroke="${colors.reference}" stroke-width="2" stroke-dasharray="6 6"/>`,
      `<text x="${labelX}" y="${ry + 7}" fill="${colors.reference}" ${font}>${escape(formatAxis(reference))}</text>`,
    );
  }
  parts.push(
    `<path d="${path}" fill="none" stroke="${line}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>`,
    `<circle cx="${x(series[series.length - 1].time)}" cy="${y(last)}" r="6" fill="${line}"/>`,
  );
  // High and low, unless they would sit on the reference label.
  const placed = reference ? [y(reference)] : [];
  for (const value of [high, low]) {
    if (placed.some((taken) => Math.abs(y(value) - taken) < 24)) continue;
    placed.push(y(value));
    parts.push(
      `<text x="${labelX}" y="${y(value) + 7}" fill="${colors.text}" ${font}>${escape(formatAxis(value))}</text>`,
    );
  }
  parts.push(
    `<text x="${PLOT.left}" y="${HEIGHT - 14}" fill="${colors.text}" ${font}>${escape(options.time(start))}</text>`,
    `<text x="${WIDTH - PLOT.right}" y="${HEIGHT - 14}" fill="${colors.text}" text-anchor="end" ${font}>${escape(options.time(end))}</text>`,
    `</svg>`,
  );
  return parts.join("");
}

export function chartMarkdown(svg: string): string {
  return `![Today's chart](data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")})`;
}
