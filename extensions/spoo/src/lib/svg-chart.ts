import { environment } from "@raycast/api";

export type Appearance = "light" | "dark";

export interface ChartTheme {
  appearance: Appearance;
  accent: string;
  text: string;
  muted: string;
  grid: string;
  track: string;
  axis: string;
  fill: string;
}

export function currentTheme(accent = "#5B7FFF"): ChartTheme {
  const appearance: Appearance =
    environment.appearance === "dark" ? "dark" : "light";
  return appearance === "dark"
    ? {
        appearance,
        accent,
        text: "#E4E4E7",
        muted: "#A1A1AA",
        grid: "rgba(140,140,140,0.22)",
        track: "rgba(210,210,210,0.22)",
        axis: "rgba(140,140,140,0.45)",
        fill: accent + "22",
      }
    : {
        appearance,
        accent,
        text: "#18181B",
        muted: "#71717A",
        grid: "rgba(120,120,120,0.22)",
        track: "rgba(0,0,0,0.06)",
        axis: "rgba(120,120,120,0.5)",
        fill: accent + "22",
      };
}

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif";

export interface LineChartPoint {
  label: string;
  value: number;
}

export interface LineChartOptions {
  title?: string;
  width?: number;
  height?: number;
  accent?: string;
  showArea?: boolean;
  showLabels?: boolean;
  yTicks?: number;
  yFormatter?: (value: number) => string;
}

export function lineChart(
  points: LineChartPoint[],
  options: LineChartOptions = {},
): string {
  // Smaller natural size → rendered container scales it up → fonts look bigger.
  const width = options.width ?? 680;
  const height = options.height ?? 400;
  const padding = {
    top: options.title ? 52 : 40,
    right: 24,
    bottom: 56,
    left: 52,
  };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const theme = currentTheme(options.accent);
  const showArea = options.showArea !== false;
  const yTicks = options.yTicks ?? 4;
  const formatter = options.yFormatter ?? ((v: number) => compact(v));

  if (points.length === 0) {
    return emptyChart(width, height, theme, "No data");
  }

  const values = points.map((p) => p.value);
  const maxY = Math.max(1, ...values);
  const minY = 0;

  const scaleX = (i: number) =>
    points.length === 1
      ? padding.left + plotW / 2
      : padding.left + (i / (points.length - 1)) * plotW;
  const scaleY = (v: number) =>
    padding.top + plotH - ((v - minY) / (maxY - minY)) * plotH;

  const linePath = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${scaleX(i).toFixed(1)} ${scaleY(p.value).toFixed(1)}`,
    )
    .join(" ");

  const areaPath =
    points.length > 0
      ? `${linePath} L ${scaleX(points.length - 1).toFixed(1)} ${(padding.top + plotH).toFixed(1)} L ${scaleX(0).toFixed(1)} ${(padding.top + plotH).toFixed(1)} Z`
      : "";

  const gridLines: string[] = [];
  for (let i = 0; i <= yTicks; i++) {
    const y = padding.top + (i / yTicks) * plotH;
    const isBaseline = i === yTicks;
    gridLines.push(
      `<line x1="${padding.left}" y1="${y.toFixed(1)}" x2="${(width - padding.right).toFixed(1)}" y2="${y.toFixed(1)}" stroke="${isBaseline ? theme.axis : theme.grid}" stroke-width="${isBaseline ? 1.5 : 1}" ${isBaseline ? "" : 'stroke-dasharray="4 6"'} />`,
    );
  }

  const yLabels: string[] = [];
  for (let i = 0; i <= yTicks; i++) {
    const value = maxY - (i / yTicks) * (maxY - minY);
    const y = padding.top + (i / yTicks) * plotH;
    yLabels.push(
      `<text x="${(padding.left - 12).toFixed(1)}" y="${(y + 6).toFixed(1)}" fill="${theme.muted}" font-size="18" font-family="${FONT_STACK}" text-anchor="end">${escapeXml(formatter(value))}</text>`,
    );
  }

  const xLabels: string[] = [];
  if (options.showLabels !== false && points.length > 1) {
    const tickCount = Math.min(5, points.length);
    for (let t = 0; t < tickCount; t++) {
      const i = Math.round((t / (tickCount - 1)) * (points.length - 1));
      const point = points[i];
      const x = scaleX(i);
      xLabels.push(
        `<text x="${x.toFixed(1)}" y="${(height - padding.bottom + 26).toFixed(1)}" fill="${theme.muted}" font-size="18" font-family="${FONT_STACK}" text-anchor="middle">${escapeXml(point.label)}</text>`,
      );
    }
  }

  const peakIndex = values.indexOf(Math.max(...values));
  const peakPoint = points[peakIndex];
  const peakDot = `
    <circle cx="${scaleX(peakIndex).toFixed(1)}" cy="${scaleY(peakPoint.value).toFixed(1)}" r="6" fill="${theme.accent}" stroke="${theme.appearance === "dark" ? "#09090B" : "#FFFFFF"}" stroke-width="2.5" />
  `;

  const lastIndex = points.length - 1;
  const lastPoint = points[lastIndex];
  const lastDot =
    lastIndex !== peakIndex
      ? `<circle cx="${scaleX(lastIndex).toFixed(1)}" cy="${scaleY(lastPoint.value).toFixed(1)}" r="4" fill="${theme.accent}" />`
      : "";

  const title = options.title
    ? `<text x="${padding.left}" y="32" fill="${theme.text}" font-size="22" font-family="${FONT_STACK}" font-weight="600">${escapeXml(options.title)}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${title}
    ${gridLines.join("\n    ")}
    ${yLabels.join("\n    ")}
    ${xLabels.join("\n    ")}
    ${showArea ? `<path d="${areaPath}" fill="${theme.fill}" />` : ""}
    <path d="${linePath}" stroke="${theme.accent}" stroke-width="2.5" fill="none" stroke-linejoin="round" stroke-linecap="round" />
    ${peakDot}
    ${lastDot}
  </svg>`;
}

export interface BarChartEntry {
  label: string;
  value: number;
  accent?: string;
}

export interface BarChartOptions {
  title?: string;
  width?: number;
  height?: number;
  accent?: string;
  maxBars?: number;
  showValues?: boolean;
  valueFormatter?: (value: number) => string;
}

export function barChart(
  entries: BarChartEntry[],
  options: BarChartOptions = {},
): string {
  const theme = currentTheme(options.accent);
  const maxBars = options.maxBars ?? 8;
  const rows = entries
    .slice()
    .sort((a, b) => b.value - a.value)
    .slice(0, maxBars);

  const rowHeight = 56;
  const rowGap = 18;
  const padding = {
    top: options.title ? 68 : 20,
    right: 60,
    bottom: 20,
    left: 140,
  };
  // Smaller natural width so the container forces scale-up; fonts appear larger.
  const barMaxWidth = 452;
  // Only pad out to a min height when the SVG is rendering its own title —
  // otherwise let it fit the rows naturally so markdown-heading charts don't
  // float in empty space.
  const minHeight = options.title ? 440 : 0;
  const barsBlock =
    rows.length === 0
      ? 0
      : rows.length * rowHeight + (rows.length - 1) * rowGap;
  const naturalHeight = padding.top + padding.bottom + barsBlock;
  const height = options.height ?? Math.max(minHeight, naturalHeight);
  const width = options.width ?? padding.left + barMaxWidth + padding.right;

  if (rows.length === 0) {
    return emptyChart(width, height, theme, "No data");
  }

  const maxValue = Math.max(1, ...rows.map((r) => r.value));
  const formatter = options.valueFormatter ?? ((v: number) => compact(v));

  // Center the bars block vertically when the chart is taller than the natural
  // row stack (e.g. only 2 bars in a 380px-min chart).
  const barsTop = padding.top + Math.max(0, (height - naturalHeight) / 2);

  const title = options.title
    ? `<text x="${padding.left}" y="42" fill="${theme.text}" font-size="24" font-family="${FONT_STACK}" font-weight="600">${escapeXml(options.title)}</text>`
    : "";

  const bars = rows
    .map((entry, index) => {
      const y = barsTop + index * (rowHeight + rowGap);
      const barWidth = Math.max(2, (entry.value / maxValue) * barMaxWidth);
      const accent = entry.accent ?? theme.accent;
      const label = truncate(entry.label || "Unknown", 18);
      const valueText = formatter(entry.value);
      return `
        <text x="${padding.left - 18}" y="${(y + rowHeight / 2 + 7).toFixed(1)}" fill="${theme.text}" font-size="20" font-family="${FONT_STACK}" text-anchor="end">${escapeXml(label)}</text>
        <rect x="${padding.left}" y="${y.toFixed(1)}" width="${barMaxWidth}" height="${rowHeight}" rx="12" fill="${theme.track}" />
        <rect x="${padding.left}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${rowHeight}" rx="12" fill="${accent}" />
        ${
          options.showValues !== false
            ? `<text x="${(padding.left + barWidth + 14).toFixed(1)}" y="${(y + rowHeight / 2 + 7).toFixed(1)}" fill="${theme.muted}" font-size="19" font-family="${FONT_STACK}">${escapeXml(valueText)}</text>`
            : ""
        }
      `;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${title}
    ${bars}
  </svg>`;
}

export function toMarkdownImage(svg: string, alt = "Chart"): string {
  const encoded = Buffer.from(svg, "utf8").toString("base64");
  return `<img src="data:image/svg+xml;base64,${encoded}" alt="${escapeXml(alt)}" />`;
}

function emptyChart(
  width: number,
  height: number,
  theme: ChartTheme,
  message: string,
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <text x="${width / 2}" y="${height / 2}" fill="${theme.muted}" font-size="12" font-family="${FONT_STACK}" text-anchor="middle" dominant-baseline="middle">${escapeXml(message)}</text>
  </svg>`;
}

function compact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return Math.round(value).toString();
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
