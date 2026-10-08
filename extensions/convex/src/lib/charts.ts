/**
 * SVG chart rendering for Detail markdown
 *
 * Generates theme-aware line charts as base64 SVG data URIs, which Raycast's
 * markdown renderer displays inline. No disk I/O, no native dependencies.
 */

import { environment } from "@raycast/api";
import { type NamedSeries, pointTimeMs } from "./metrics";

// Palette validated for both Raycast surfaces (dataviz six-checks):
// first three categorical slots are all-pairs CVD-safe in both modes.
const THEMES = {
  light: {
    surface: "#fcfcfb",
    grid: "#e4e3df",
    textPrimary: "#0b0b0b",
    textSecondary: "#52514e",
    series: ["#2a78d6", "#eb6834", "#1baf7a"],
    rest: "#8e8d89",
    critical: "#d03b3b",
  },
  dark: {
    surface: "#1a1a19",
    grid: "#383835",
    textPrimary: "#ffffff",
    textSecondary: "#c3c2b7",
    series: ["#3987e5", "#d95926", "#199e70"],
    rest: "#8e8d89",
    critical: "#e66767",
  },
} as const;

export type ChartTheme = keyof typeof THEMES;

export function currentTheme(): ChartTheme {
  return environment.appearance === "light" ? "light" : "dark";
}

/** Color for series index i; the "_rest" aggregate always gets neutral gray */
export function seriesColor(
  index: number,
  name: string,
  theme: ChartTheme,
): string {
  if (name === "_rest") return THEMES[theme].rest;
  return THEMES[theme].series[index % THEMES[theme].series.length];
}

export interface LineChartOptions {
  series: NamedSeries[];
  /** Formats y-axis and label values, e.g. (v) => `${v}%` */
  formatValue?: (value: number) => string;
  /** Use the status-critical color for a single series (error charts) */
  statusCritical?: boolean;
  width?: number;
  height?: number;
  /** Fixed y-axis maximum (e.g. 100 for percentages); otherwise data max */
  yMax?: number;
}

const escapeXml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function formatTime(ms: number): string {
  const date = new Date(ms);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

const defaultFormat = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(2);

/**
 * Render a multi-series line chart and return a markdown image tag.
 * Null buckets break the line (no data ≠ zero).
 */
export function lineChartMarkdown(options: LineChartOptions): string {
  const {
    series,
    formatValue = defaultFormat,
    statusCritical = false,
    width = 660,
    height = 240,
    yMax: fixedYMax,
  } = options;
  const theme = currentTheme();
  const colors = THEMES[theme];

  const padding = { top: 14, right: 130, bottom: 26, left: 46 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const allPoints = series.flatMap((s) => s.points);
  if (
    allPoints.length === 0 ||
    series.every((s) => s.points.every(([, v]) => v === null))
  ) {
    return emptyChartMarkdown(width, height, theme);
  }

  const minX = Math.min(...allPoints.map(pointTimeMs));
  const maxX = Math.max(...allPoints.map(pointTimeMs));
  const dataMax = Math.max(
    ...allPoints.map(([, value]) => value ?? 0),
    Number.MIN_VALUE,
  );
  const yMax = fixedYMax ?? (dataMax > 0 ? dataMax * 1.1 : 1);

  const xFor = (ms: number) =>
    padding.left + ((ms - minX) / Math.max(maxX - minX, 1)) * plotWidth;
  const yFor = (value: number) =>
    padding.top + plotHeight - (Math.min(value, yMax) / yMax) * plotHeight;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="${colors.surface}" rx="8"/>`,
  );

  // Recessive horizontal grid: baseline + two intermediate lines
  const gridSteps = [0, 0.5, 1];
  for (const step of gridSteps) {
    const y = padding.top + plotHeight - step * plotHeight;
    parts.push(
      `<line x1="${padding.left}" y1="${y}" x2="${padding.left + plotWidth}" y2="${y}" stroke="${colors.grid}" stroke-width="1"/>`,
      `<text x="${padding.left - 6}" y="${y + 4}" text-anchor="end" font-family="ui-sans-serif,system-ui" font-size="11" fill="${colors.textSecondary}">${escapeXml(formatValue(yMax * step))}</text>`,
    );
  }

  // X-axis time labels: start, middle, end
  for (const fraction of [0, 0.5, 1]) {
    const ms = minX + fraction * (maxX - minX);
    const anchor = fraction === 0 ? "start" : fraction === 1 ? "end" : "middle";
    parts.push(
      `<text x="${padding.left + fraction * plotWidth}" y="${height - 8}" text-anchor="${anchor}" font-family="ui-sans-serif,system-ui" font-size="11" fill="${colors.textSecondary}">${formatTime(ms)}</text>`,
    );
  }

  // Series lines with gap-breaking on nulls
  series.forEach((s, index) => {
    const color =
      statusCritical && series.length === 1
        ? colors.critical
        : seriesColor(index, s.name, theme);

    let path = "";
    let penDown = false;
    for (const point of s.points) {
      const [, value] = point;
      if (value === null) {
        penDown = false;
        continue;
      }
      const x = xFor(pointTimeMs(point));
      const y = yFor(value);
      path += `${penDown ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
      penDown = true;
    }
    if (path) {
      parts.push(
        `<path d="${path}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`,
      );
    }

    // Direct label at the right edge: colored dot carries identity, text
    // stays in text tokens
    const labelY = padding.top + 16 + index * 18;
    const label = s.name === "_rest" ? "other" : s.name;
    parts.push(
      `<circle cx="${padding.left + plotWidth + 12}" cy="${labelY - 4}" r="4" fill="${color}"/>`,
      `<text x="${padding.left + plotWidth + 22}" y="${labelY}" font-family="ui-sans-serif,system-ui" font-size="11" fill="${colors.textSecondary}">${escapeXml(truncate(label, 18))}</text>`,
    );
  });

  parts.push("</svg>");
  const uri = `data:image/svg+xml;base64,${Buffer.from(parts.join(""), "utf8").toString("base64")}`;
  return `![chart](${uri}?raycast-width=${Math.round(width / 2)}&raycast-height=${Math.round(height / 2)})`;
}

function emptyChartMarkdown(
  width: number,
  height: number,
  theme: ChartTheme,
): string {
  const colors = THEMES[theme];
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="${width}" height="${height}" fill="${colors.surface}" rx="8"/>` +
    `<text x="${width / 2}" y="${height / 2}" text-anchor="middle" font-family="ui-sans-serif,system-ui" font-size="13" fill="${colors.textSecondary}">No data in this window</text>` +
    `</svg>`;
  const uri = `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
  return `![chart](${uri}?raycast-width=${Math.round(width / 2)}&raycast-height=${Math.round(height / 2)})`;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Unicode sparkline for List.Item accessories */
export function sparkline(values: (number | null)[]): string {
  const blocks = "▁▂▃▄▅▆▇█";
  const present = values.filter((v): v is number => v !== null);
  if (present.length === 0) return "";
  const max = Math.max(...present);
  return values
    .map((value) => {
      if (value === null) return " ";
      if (max === 0) return blocks[0];
      const index = Math.min(
        blocks.length - 1,
        Math.round((value / max) * (blocks.length - 1)),
      );
      return blocks[index];
    })
    .join("");
}
