/**
 * Draws every chart and card as an SVG image. Each function builds
 * SVG markup as a string and returns it as a base64 "data:" URI
 * that the views embed in Markdown as an image.
 *
 * Every card uses the same layout language: a rounded background rectangle,
 * a title at the top left, and the latest value at the top right.
 */

import { environment } from "@raycast/api";
import { formatBytes } from "./formatting";

/**
 * Sanitizes raw string input for safe embedding within SVG XML text nodes.
 *
 * @param unsafe The raw string to escape.
 * @returns XML-safe string.
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Encodes an SVG markup string into a base64 data URI suitable for Raycast Markdown images.
 *
 * @param svg The raw SVG markup string.
 * @returns Base64 data URI string (`data:image/svg+xml;base64,...`).
 */
function svgToDataUri(svg: string): string {
  const base64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Normalizes input that may be either raw SVG markup or a base64 SVG data URI
 * back into raw SVG markup string.
 *
 * @param input Raw SVG string or data URI.
 * @returns Raw SVG XML string.
 */
function normalizeToSvg(input?: string | null): string {
  if (!input) return "";
  if (input.startsWith("data:image/svg+xml;base64,")) {
    const base64 = input.replace("data:image/svg+xml;base64,", "");
    return Buffer.from(base64, "base64").toString("utf-8");
  }
  return input;
}

/**
 * Downsamples an array of numerical data points to at most `maxPoints` using local averaging.
 * Preserves the final data point to reflect the most recent state accurately.
 *
 * @param data Array of numbers to downsample.
 * @param maxPoints Maximum number of data points desired (default: 60).
 * @returns Downsampled array of numbers.
 */
function downsample(data: number[], maxPoints = 60): number[] {
  if (data.length <= maxPoints) return data;
  const result: number[] = [];
  const step = data.length / maxPoints;
  for (let i = 0; i < maxPoints; i++) {
    const start = Math.floor(i * step);
    const end = Math.floor((i + 1) * step);
    let sum = 0;
    let count = 0;
    for (let j = start; j < end && j < data.length; j++) {
      sum += data[j];
      count++;
    }
    result.push(count > 0 ? sum / count : data[start]);
  }
  if (result.length > 0 && data.length > 0) {
    result[result.length - 1] = data[data.length - 1];
  }
  return result;
}

/**
 * Rounds a chart ceiling up to a "nice" number (1, 2, 5 times a power of ten) so axis
 * labels read cleanly. Values at or below zero get a ceiling of 1.
 */
function niceCeiling(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  let step = 10;
  if (normalized <= 1) {
    step = 1;
  } else if (normalized <= 2) {
    step = 2;
  } else if (normalized <= 5) {
    step = 5;
  }
  return step * magnitude;
}

/**
 * Formats an axis tick: integers as-is, small values with one decimal.
 */
function formatAxis(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * Theme color tokens and styles for rendering SVG cards and charts.
 * Supports both dark and light modes matching Raycast appearance.
 */
export interface ChartTheme {
  isDark: boolean;
  cardBg: string;
  cardBorder: string;
  cardSubBg: string;
  cardSubBorder: string;
  trackBg: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDim: string;
  gridLine: string;
  gridLineBase: string;
  dotFill: string;
  cpu: string;
  memory: string;
  diskRead: string;
  diskWrite: string;
  power: string;
  gpu: string;
  thermalA: string;
  thermalB: string;
  pressureNominal: string;
  pressureWarning: string;
  pressureCritical: string;
  warningPills: {
    critical: { stroke: string; fill: string; textColor: string };
    warning: { stroke: string; fill: string; textColor: string };
    caution: { stroke: string; fill: string; textColor: string };
  };
}

/**
 * Retrieves the active ChartTheme based on Raycast's current appearance mode (dark or light).
 * Cards use 85% transparent black in dark mode and 85% transparent white in light mode.
 *
 * @returns The active ChartTheme.
 */
export function getTheme(): ChartTheme {
  const isDark = environment.appearance === "dark";
  if (isDark) {
    return {
      isDark: true,
      cardBg: "rgba(0, 0, 0, 0.25)",
      cardBorder: "#28282C",
      cardSubBg: "#1C1C20",
      cardSubBorder: "#2A2A30",
      trackBg: "#282830",
      textPrimary: "#FFFFFF",
      textSecondary: "#E6E6EA",
      textMuted: "#8E8E93",
      textDim: "#6E6E73",
      gridLine: "#2C2C32",
      gridLineBase: "#3A3A42",
      dotFill: "#FFFFFF",
      cpu: "#BF5AF2",
      memory: "#0A84FF",
      diskRead: "#64D2FF",
      diskWrite: "#FF9F0A",
      power: "#FFD60A",
      gpu: "#30D158",
      thermalA: "#FF453A",
      thermalB: "#FF9F0A",
      pressureNominal: "#30D158",
      pressureWarning: "#FF9F0A",
      pressureCritical: "#FF453A",
      warningPills: {
        critical: { stroke: "#FF453A", fill: "rgba(255, 69, 58, 0.18)", textColor: "#FF6961" },
        warning: { stroke: "#FF9F0A", fill: "rgba(255, 159, 10, 0.16)", textColor: "#FFD60A" },
        caution: { stroke: "#FFD60A", fill: "rgba(255, 214, 10, 0.14)", textColor: "#FFE066" },
      },
    };
  }

  return {
    isDark: false,
    cardBg: "rgba(255, 255, 255, 0.25)",
    cardBorder: "#E5E5EA",
    cardSubBg: "#F2F2F7",
    cardSubBorder: "#E5E5EA",
    trackBg: "#E5E5EA",
    textPrimary: "#1C1C1E",
    textSecondary: "#2C2C2E",
    textMuted: "#636366",
    textDim: "#8E8E93",
    gridLine: "#E5E5EA",
    gridLineBase: "#C7C7CC",
    dotFill: "#FFFFFF",
    cpu: "#AF52DE",
    memory: "#007AFF",
    diskRead: "#0284C7",
    diskWrite: "#EA580C",
    power: "#D97706",
    gpu: "#16A34A",
    thermalA: "#DC2626",
    thermalB: "#EA580C",
    pressureNominal: "#16A34A",
    pressureWarning: "#EA580C",
    pressureCritical: "#DC2626",
    warningPills: {
      critical: { stroke: "#FF3B30", fill: "rgba(255, 59, 48, 0.12)", textColor: "#D70015" },
      warning: { stroke: "#FF9500", fill: "rgba(255, 149, 0, 0.12)", textColor: "#C96E00" },
      caution: { stroke: "#E5A100", fill: "rgba(255, 204, 0, 0.15)", textColor: "#996800" },
    },
  };
}

export function adaptColor(color: string, theme: ChartTheme): string {
  if (theme.isDark) return color;
  const upper = color.toUpperCase();
  const map: Record<string, string> = {
    "#BF5AF2": theme.cpu,
    "#0A84FF": theme.memory,
    "#64D2FF": theme.diskRead,
    "#FF9F0A": theme.diskWrite,
    "#FFD60A": theme.power,
    "#30D158": theme.gpu,
    "#FF453A": theme.thermalA,
    "#FF375F": "#E11D48",
    "#5E5CE6": "#4F46E5",
  };
  return map[upper] || color;
}

/**
 * Representation of an active system telemetry warning or threshold violation.
 */
export interface WarningPill {
  id: string;
  label: string;
  level: "critical" | "warning" | "caution";
}

/** Picks the pill colors for a warning level. */
function pillStyleFor(level: WarningPill["level"], theme: ChartTheme) {
  if (level === "critical") {
    return theme.warningPills.critical;
  }
  if (level === "caution") {
    return theme.warningPills.caution;
  }
  return theme.warningPills.warning;
}

/**
 * Generates an SVG row of rounded status warning pills displayed at the top of the dashboard.
 * Shows high-priority system alerts (e.g., severe memory pressure, high thermal throttling).
 *
 * @param warnings Array of active WarningPills.
 * @param width Total SVG canvas width (default: 760).
 * @returns SVG data URI, or null if no warnings are active.
 */
export function generateWarningPills(warnings: WarningPill[], width = 760): string | null {
  if (!warnings || warnings.length === 0) return null;

  const theme = getTheme();
  const gap = 10;
  const pillHeight = 28;
  const maxPillsPerRow = 4;
  const activeCount = Math.min(warnings.length, maxPillsPerRow);
  const pillWidth = Math.floor((width - (activeCount - 1) * gap) / activeCount);
  const height = pillHeight + 6;

  const renderedPills = warnings.slice(0, 4).map((w, i) => {
    const x = i * (pillWidth + gap);
    const y = 3;

    const pillStyle = pillStyleFor(w.level, theme);

    return `
      <g transform="translate(${x}, ${y})">
        <rect width="${pillWidth}" height="${pillHeight}" rx="14" fill="${pillStyle.fill}" stroke="${pillStyle.stroke}" stroke-width="1.2"/>
        <circle cx="14" cy="14" r="4" fill="${pillStyle.stroke}"/>
        <text x="25" y="18" fill="${pillStyle.textColor}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="600">${escapeXml(w.label)}</text>
      </g>
    `;
  });

  const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  ${renderedPills.join("\n")}
</svg>
  `.trim();

  return svgToDataUri(svg);
}

/**
 * Single item row in a mini leaderboard card.
 */
export interface LeaderboardItem {
  name: string;
  value: string;
  color?: string;
}

/**
 * Generates a compact 5-row leaderboard card suitable for side-by-side dashboard placement.
 *
 * @param title Header title for the leaderboard (e.g., "Top Memory Consumers").
 * @param items Array of ranked items.
 * @param accentColor Accent color for rank numbers and values.
 * @param width Card width in pixels (default: 374).
 * @param height Card height in pixels (default: 180).
 * @returns Base64 SVG data URI.
 */
export function generateMiniLeaderboardCard(
  title: string,
  items: LeaderboardItem[],
  accentColor = "#0A84FF",
  width = 374,
  height = 180,
): string {
  const theme = getTheme();
  const visibleItems = items.slice(0, 5);
  const rowHeight = 26;
  const startY = 36;
  const resolvedAccent = adaptColor(accentColor, theme);

  const rows = visibleItems.map((item, i) => {
    const y = startY + i * rowHeight + 17;
    const isEven = i % 2 === 0;
    const bg = isEven
      ? `<rect x="10" y="${y - 13}" width="${width - 20}" height="${rowHeight - 2}" rx="4" fill="${theme.cardSubBg}" opacity="${theme.isDark ? 0.6 : 1.0}"/>`
      : "";
    const cleanName = item.name.length > 20 ? item.name.slice(0, 19) + "..." : item.name;
    const valColor = item.color ? adaptColor(item.color, theme) : resolvedAccent;

    return `
      ${bg}
      <text x="16" y="${y}" fill="${theme.textDim}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="600">${i + 1}</text>
      <text x="34" y="${y}" fill="${theme.textPrimary}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600">${escapeXml(cleanName)}</text>
      <text x="${width - 16}" y="${y}" fill="${valColor}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="700" text-anchor="end">${escapeXml(item.value)}</text>
    `;
  });

  const emptyState =
    visibleItems.length === 0
      ? `<text x="${width / 2}" y="${height / 2 + 4}" fill="${theme.textMuted}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" text-anchor="middle">No active applications</text>`
      : "";

  const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" rx="10" fill="${theme.cardBg}" stroke="${theme.cardBorder}" stroke-width="1"/>
  <text x="16" y="24" fill="${theme.textSecondary}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="600">${escapeXml(title)}</text>
  ${rows.join("\n")}
  ${emptyState}
</svg>
  `.trim();

  return svgToDataUri(svg);
}

/**
 * Combines two half-width card SVGs side by side into a single full-width dashboard row SVG.
 * Ensures consistent alignment across Raycast Markdown image rendering.
 *
 * @param card1Input SVG data URI or markup for the left card.
 * @param card2Input Optional SVG data URI or markup for the right card.
 * @param width Row width in pixels (default: 760).
 * @param height Row height in pixels (default: 180).
 * @returns Combined base64 SVG data URI.
 */
export function renderCardRow(card1Input: string, card2Input?: string | null, width = 760, height = 180): string {
  const svg1 = normalizeToSvg(card1Input);
  const svg2 = normalizeToSvg(card2Input);

  const cardWidth = Math.floor((width - 12) / 2);
  const card2X = cardWidth + 12;

  const clean1 = svg1.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const clean2 = svg2 ? svg2.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "") : "";

  const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(0, 0)">
    ${clean1}
  </g>
  ${card2Svg(clean2, card2X)}
</svg>
  `.trim();

  return svgToDataUri(svg);
}

function card2Svg(clean2: string, card2X: number): string {
  if (!clean2) return "";
  return `<g transform="translate(${card2X}, 0)">\n    ${clean2}\n  </g>`;
}

/**
 * Generates a single-series area chart card with smooth Bézier curvature, vertical gradient fill,
 * reference grid guidelines, axis labels, and latest value badge.
 *
 * @param data Array of historical value points.
 * @param options Chart layout configuration (dimensions, color, label, unit, scale).
 * @returns Base64 SVG data URI.
 */
export function generateAreaChart(
  data: number[],
  options: {
    width?: number;
    height?: number;
    color?: string;
    label?: string;
    unit?: string;
    maxValue?: number;
    idPrefix?: string;
  } = {},
): string {
  const theme = getTheme();
  const width = options.width || 760;
  const height = options.height || 180;
  const rawColor = options.color || "#0A84FF";
  const color = adaptColor(rawColor, theme);
  const label = options.label || "";
  const unit = options.unit || "%";

  // Compact cards are the half-width dashboard cards; they get tighter padding and smaller text.
  const isCompact = width <= 400;
  const paddingLeft = isCompact ? 46 : 50;
  const paddingRight = 16;
  const paddingTop = 36;
  const paddingBottom = 24;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const rawPoints = data.length > 0 ? data : [0, 0];
  const points = downsample(rawPoints, 60);

  const maxData = Math.max(...points, 0);
  const max = options.maxValue !== undefined ? Math.max(options.maxValue, maxData) : niceCeiling(maxData * 1.15);
  const latest = rawPoints[rawPoints.length - 1];

  // Coordinates
  const stepX = points.length > 1 ? chartWidth / (points.length - 1) : chartWidth;
  const coords = points.map((val, i) => {
    const x = paddingLeft + i * stepX;
    const normalized = Math.min(1, Math.max(0, val / max));
    const y = paddingTop + chartHeight - normalized * chartHeight;
    return { x, y };
  });

  // Construct SVG path
  let pathD = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];
    const cpX1 = prev.x + (curr.x - prev.x) / 2;
    const cpX2 = cpX1;
    pathD += ` C ${cpX1} ${prev.y}, ${cpX2} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  const fillD = `${pathD} L ${coords[coords.length - 1].x} ${paddingTop + chartHeight} L ${coords[0].x} ${paddingTop + chartHeight} Z`;

  // Guideline values (0%, 50%, 100%)
  const y0 = paddingTop + chartHeight;
  const y50 = paddingTop + chartHeight / 2;
  const y100 = paddingTop;

  const gradId = `chartGrad_${color.replace("#", "")}_${(options.idPrefix || label).replace(/[^a-zA-Z0-9]/g, "")}`;
  const stopTop = theme.isDark ? "0.38" : "0.24";
  const stopMid = theme.isDark ? "0.04" : "0.02";

  const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity="${stopTop}"/>
      <stop offset="90%" stop-color="${color}" stop-opacity="${stopMid}"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0.0"/>
    </linearGradient>
  </defs>

  <!-- Background Card -->
  <rect width="${width}" height="${height}" rx="10" fill="${theme.cardBg}" stroke="${theme.cardBorder}" stroke-width="1"/>

  <!-- Guidelines -->
  <line x1="${paddingLeft}" y1="${y100}" x2="${width - paddingRight}" y2="${y100}" stroke="${theme.gridLine}" stroke-width="1" stroke-dasharray="3,3"/>
  <line x1="${paddingLeft}" y1="${y50}" x2="${width - paddingRight}" y2="${y50}" stroke="${theme.gridLine}" stroke-width="1" stroke-dasharray="3,3"/>
  <line x1="${paddingLeft}" y1="${y0}" x2="${width - paddingRight}" y2="${y0}" stroke="${theme.gridLineBase}" stroke-width="1"/>

  <!-- Y-Axis Labels -->
  <text x="${paddingLeft - 8}" y="${y100 + 4}" fill="${theme.textMuted}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" text-anchor="end">${formatAxis(max)}${unit}</text>
  <text x="${paddingLeft - 8}" y="${y50 + 4}" fill="${theme.textMuted}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" text-anchor="end">${formatAxis(max / 2)}${unit}</text>
  <text x="${paddingLeft - 8}" y="${y0 + 4}" fill="${theme.textMuted}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" text-anchor="end">0${unit}</text>

  <!-- Area Fill -->
  <path d="${fillD}" fill="url(#${gradId})"/>

  <!-- Stroke Line -->
  <path d="${pathD}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Current Value Indicator -->
  <circle cx="${coords[coords.length - 1].x}" cy="${coords[coords.length - 1].y}" r="3.5" fill="${theme.dotFill}" stroke="${color}" stroke-width="2"/>

  <!-- Header Text -->
  <text x="16" y="24" fill="${theme.textSecondary}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="600">${escapeXml(label)}</text>
  <text x="${width - 16}" y="24" fill="${color}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="700" text-anchor="end">${latest.toFixed(1)}${unit}</text>
</svg>
  `.trim();

  return svgToDataUri(svg);
}

/**
 * Generates a dual-series area chart card comparing two time-series curves simultaneously
 * (e.g., Disk Read vs. Disk Write, or Network In vs. Network Out).
 *
 * @param dataA Data points for series A.
 * @param dataB Data points for series B.
 * @param options Styling and labeling options for both series.
 * @returns Base64 SVG data URI.
 */
export function generateDualAreaChart(
  dataA: number[],
  dataB: number[],
  options: {
    width?: number;
    height?: number;
    title?: string;
    labelA: string;
    labelB: string;
    colorA: string;
    colorB: string;
    unit?: string;
    idPrefix?: string;
  },
): string {
  const theme = getTheme();
  const width = options.width || 760;
  const height = options.height || 180;
  const isCompact = width <= 400;
  const paddingLeft = isCompact ? 54 : 55;
  const paddingRight = 16;
  const paddingTop = 36;
  const paddingBottom = 24;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const rawA = dataA.length > 0 ? dataA : [0, 0];
  const rawB = dataB.length > 0 ? dataB : [0, 0];

  const ptsA = downsample(rawA, 60);
  const ptsB = downsample(rawB, 60);
  const count = Math.max(ptsA.length, ptsB.length);

  const max = niceCeiling(Math.max(...ptsA, ...ptsB, 0) * 1.15);

  const stepX = count > 1 ? chartWidth / (count - 1) : chartWidth;

  const colorA = adaptColor(options.colorA, theme);
  const colorB = adaptColor(options.colorB, theme);

  const getPath = (pts: number[]) => {
    const coords = pts.map((val, i) => {
      const x = paddingLeft + i * stepX;
      const normalized = Math.min(1, Math.max(0, val / max));
      const y = paddingTop + chartHeight - normalized * chartHeight;
      return { x, y };
    });

    let pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const cpX = prev.x + (curr.x - prev.x) / 2;
      pathD += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    const fillD = `${pathD} L ${coords[coords.length - 1].x} ${paddingTop + chartHeight} L ${coords[0].x} ${paddingTop + chartHeight} Z`;
    return { pathD, fillD, last: coords[coords.length - 1] };
  };

  const curveA = getPath(ptsA);
  const curveB = getPath(ptsB);

  const y0 = paddingTop + chartHeight;
  const y50 = paddingTop + chartHeight / 2;
  const y100 = paddingTop;

  const latestA = rawA[rawA.length - 1] || 0;
  const latestB = rawB[rawB.length - 1] || 0;
  const unit = options.unit || "MB/s";
  const idSuffix = (options.idPrefix || "dual").replace(/[^a-zA-Z0-9]/g, "");
  const stopTop = theme.isDark ? "0.32" : "0.20";

  const legendA = isCompact
    ? `
      <circle cx="16" cy="20" r="3.5" fill="${colorA}"/>
      <text x="24" y="24" fill="${theme.textSecondary}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="600">${escapeXml(options.labelA)} <tspan fill="${colorA}" font-weight="700">${latestA.toFixed(1)}${unit}</tspan></text>
    `
    : `
      <circle cx="20" cy="19" r="4" fill="${colorA}"/>
      <text x="30" y="23" fill="${theme.textSecondary}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600">${escapeXml(options.labelA)}:</text>
      <text x="120" y="23" fill="${colorA}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="700">${latestA.toFixed(1)} ${unit}</text>
    `;

  const legendB = isCompact
    ? `
      <circle cx="${width - 120}" cy="20" r="3.5" fill="${colorB}"/>
      <text x="${width - 112}" y="24" fill="${theme.textSecondary}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="600">${escapeXml(options.labelB)} <tspan fill="${colorB}" font-weight="700">${latestB.toFixed(1)}${unit}</tspan></text>
    `
    : `
      <circle cx="240" cy="19" r="4" fill="${colorB}"/>
      <text x="250" y="23" fill="${theme.textSecondary}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600">${escapeXml(options.labelB)}:</text>
      <text x="340" y="23" fill="${colorB}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="700">${latestB.toFixed(1)} ${unit}</text>
    `;

  // The header is either a title with the two latest values, or (without a title) two legends.
  let headerContent: string;
  if (options.title && isCompact) {
    headerContent = `
        <text x="16" y="24" fill="${theme.textSecondary}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600">${escapeXml(options.title)}</text>
        <circle cx="${width - 132}" cy="20" r="3.5" fill="${colorA}"/>
        <text x="${width - 124}" y="24" fill="${colorA}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="700">${latestA.toFixed(1)}</text>
        <circle cx="${width - 70}" cy="20" r="3.5" fill="${colorB}"/>
        <text x="${width - 62}" y="24" fill="${colorB}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="700">${latestB.toFixed(1)}${unit}</text>
      `;
  } else if (options.title) {
    headerContent = `
        <text x="16" y="23" fill="${theme.textSecondary}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="600">${escapeXml(options.title)}</text>
        <circle cx="${width - 310}" cy="19" r="4" fill="${colorA}"/>
        <text x="${width - 300}" y="23" fill="${theme.textSecondary}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600">${escapeXml(options.labelA)}: <tspan fill="${colorA}" font-weight="700">${latestA.toFixed(1)} ${unit}</tspan></text>
        <circle cx="${width - 150}" cy="19" r="4" fill="${colorB}"/>
        <text x="${width - 140}" y="23" fill="${theme.textSecondary}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600">${escapeXml(options.labelB)}: <tspan fill="${colorB}" font-weight="700">${latestB.toFixed(1)} ${unit}</tspan></text>
      `;
  } else {
    headerContent = `${legendA}\n  ${legendB}`;
  }

  const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradA_${idSuffix}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${colorA}" stop-opacity="${stopTop}"/>
      <stop offset="100%" stop-color="${colorA}" stop-opacity="0.0"/>
    </linearGradient>
    <linearGradient id="gradB_${idSuffix}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${colorB}" stop-opacity="${stopTop}"/>
      <stop offset="100%" stop-color="${colorB}" stop-opacity="0.0"/>
    </linearGradient>
  </defs>

  <rect width="${width}" height="${height}" rx="10" fill="${theme.cardBg}" stroke="${theme.cardBorder}" stroke-width="1"/>

  <line x1="${paddingLeft}" y1="${y100}" x2="${width - paddingRight}" y2="${y100}" stroke="${theme.gridLine}" stroke-width="1" stroke-dasharray="3,3"/>
  <line x1="${paddingLeft}" y1="${y50}" x2="${width - paddingRight}" y2="${y50}" stroke="${theme.gridLine}" stroke-width="1" stroke-dasharray="3,3"/>
  <line x1="${paddingLeft}" y1="${y0}" x2="${width - paddingRight}" y2="${y0}" stroke="${theme.gridLineBase}" stroke-width="1"/>

  <text x="${paddingLeft - 8}" y="${y100 + 4}" fill="${theme.textMuted}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" text-anchor="end">${formatAxis(max)}${unit}</text>
  <text x="${paddingLeft - 8}" y="${y50 + 4}" fill="${theme.textMuted}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" text-anchor="end">${formatAxis(max / 2)}</text>
  <text x="${paddingLeft - 8}" y="${y0 + 4}" fill="${theme.textMuted}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" text-anchor="end">0</text>

  <!-- Curve A -->
  <path d="${curveA.fillD}" fill="url(#gradA_${idSuffix})"/>
  <path d="${curveA.pathD}" fill="none" stroke="${colorA}" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="${curveA.last.x}" cy="${curveA.last.y}" r="3" fill="${theme.dotFill}" stroke="${colorA}" stroke-width="2"/>

  <!-- Curve B -->
  <path d="${curveB.fillD}" fill="url(#gradB_${idSuffix})"/>
  <path d="${curveB.pathD}" fill="none" stroke="${colorB}" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="${curveB.last.x}" cy="${curveB.last.y}" r="3" fill="${theme.dotFill}" stroke="${colorB}" stroke-width="2"/>

  <!-- Legend & Values -->
  ${headerContent}
</svg>
  `.trim();

  return svgToDataUri(svg);
}

/**
 * Generates a proportional multi-colored stacked progress bar card with legend breakdowns.
 * Used for Memory Composition (App, Wired, Compressed, Cached, Free).
 *
 * @param slices Array of proportioned segment definitions with labels and colors.
 * @param total Total quantity representing 100% width.
 * @param title Header title for the card.
 * @param width Card width in pixels (default: 760).
 * @param height Card height in pixels (default: 90).
 * @param subtitle Optional right-aligned header subtitle (e.g., active swap info).
 * @returns Base64 SVG data URI.
 */
export function generateStackedBar(
  slices: { label: string; value: number; color: string; formatted?: string }[],
  total: number,
  title: string,
  width = 760,
  height = 90,
  subtitle?: string,
): string {
  const theme = getTheme();
  const isCompact = width <= 400 || height >= 140;
  const padding = 16;
  const barY = isCompact ? 40 : 34;
  const barHeight = isCompact ? 16 : 14;
  const availWidth = width - padding * 2;
  let displaySubtitle = subtitle;
  if (displaySubtitle === undefined) {
    displaySubtitle = `Total ${formatBytes(total)}`;
  }

  let currentX = padding;
  const rects: string[] = [];
  const legendItems: string[] = [];

  const validTotal = total > 0 ? total : 1;

  for (let i = 0; i < slices.length; i++) {
    const s = slices[i];
    const sliceColor = adaptColor(s.color, theme);
    const sliceWidth = Math.max(s.value > 0 ? 2 : 0, (s.value / validTotal) * availWidth);
    if (sliceWidth > 0) {
      rects.push(
        `<rect x="${currentX}" y="${barY}" width="${sliceWidth}" height="${barHeight}" fill="${sliceColor}"/>`,
      );
      currentX += sliceWidth;
    }
  }

  if (isCompact) {
    const colWidth = Math.floor(availWidth / 2);
    for (let i = 0; i < slices.length; i++) {
      const s = slices[i];
      const sliceColor = adaptColor(s.color, theme);
      const col = i % 2;
      const row = Math.floor(i / 2);
      const lx = padding + col * (colWidth + 8);
      const ly = 74 + row * 30;
      const displayVal = s.formatted || formatBytes(s.value);
      legendItems.push(`
        <circle cx="${lx + 4}" cy="${ly + 4}" r="3.5" fill="${sliceColor}"/>
        <text x="${lx + 14}" y="${ly + 6}" fill="${theme.textMuted}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11">${escapeXml(s.label)}</text>
        <text x="${lx + 14}" y="${ly + 20}" fill="${theme.textPrimary}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="600">${escapeXml(displayVal)}</text>
      `);
    }
  } else {
    const legendY = 68;
    const itemWidth = availWidth / Math.min(6, slices.length);

    for (let i = 0; i < slices.length; i++) {
      const s = slices[i];
      const sliceColor = adaptColor(s.color, theme);
      const lx = padding + i * itemWidth;
      const displayVal = s.formatted || formatBytes(s.value);
      legendItems.push(`
        <circle cx="${lx + 4}" cy="${legendY - 3}" r="3.5" fill="${sliceColor}"/>
        <text x="${lx + 12}" y="${legendY}" fill="${theme.textMuted}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10">${escapeXml(s.label)}</text>
        <text x="${lx + 12}" y="${legendY + 12}" fill="${theme.textPrimary}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" font-weight="600">${escapeXml(displayVal)}</text>
      `);
    }
  }

  const clipId = `barClip_${title.replace(/[^a-zA-Z0-9]/g, "_")}`;

  const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" rx="10" fill="${theme.cardBg}" stroke="${theme.cardBorder}" stroke-width="1"/>

  <text x="16" y="24" fill="${theme.textSecondary}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="600">${escapeXml(title)}</text>
  <text x="${width - 16}" y="24" fill="${theme.textMuted}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" text-anchor="end">${escapeXml(displaySubtitle)}</text>

  <!-- Segmented Track Background -->
  <clipPath id="${clipId}">
    <rect x="${padding}" y="${barY}" width="${availWidth}" height="${barHeight}" rx="4"/>
  </clipPath>

  <g clip-path="url(#${clipId})">
    <rect x="${padding}" y="${barY}" width="${availWidth}" height="${barHeight}" fill="${theme.trackBg}"/>
    ${rects.join("\n")}
  </g>

  <!-- Legend -->
  ${legendItems.join("\n")}
</svg>
  `.trim();

  return svgToDataUri(svg);
}

/**
 * Generates the empty-state image shown when there is no live data to display:
 *
 * @param message Text shown under the icon.
 * @param width Canvas width in pixels (default: 760).
 * @param height Canvas height in pixels (default: 400).
 * @returns Base64 SVG data URI.
 */
export function generateInactiveSvg(message: string, width = 760, height = 400): string {
  const theme = getTheme();
  const centerX = width / 2;
  const centerY = height / 2;

  // Icon geometry: 52px wide, 40px tall window with pulse wave
  const iconW = 52;
  const iconH = 40;
  const iconX = centerX - iconW / 2;
  const iconY = centerY - 44;

  const strokeColor = "#8E8E93";
  const strokeOpacity = theme.isDark ? 0.5 : 0.45;
  const textColor = theme.isDark ? "rgba(255, 255, 255, 0.45)" : "rgba(0, 0, 0, 0.45)";

  const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Window Outline -->
  <rect x="${iconX}" y="${iconY}" width="${iconW}" height="${iconH}" rx="8" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-opacity="${strokeOpacity}"/>

  <!-- Title bar divider -->
  <line x1="${iconX}" y1="${iconY + 12}" x2="${iconX + iconW}" y2="${iconY + 12}" stroke="${strokeColor}" stroke-width="1.2" stroke-opacity="${strokeOpacity * 0.7}"/>

  <!-- Window controls -->
  <circle cx="${iconX + 7}" cy="${iconY + 6}" r="1.5" fill="${strokeColor}" fill-opacity="${strokeOpacity}"/>
  <circle cx="${iconX + 12}" cy="${iconY + 6}" r="1.5" fill="${strokeColor}" fill-opacity="${strokeOpacity}"/>
  <circle cx="${iconX + 17}" cy="${iconY + 6}" r="1.5" fill="${strokeColor}" fill-opacity="${strokeOpacity}"/>

  <!-- Activity pulse line -->
  <path d="M ${iconX + 8} ${iconY + 26} L ${iconX + 18} ${iconY + 26} L ${iconX + 22} ${iconY + 18} L ${iconX + 27} ${iconY + 33} L ${iconX + 31} ${iconY + 22} L ${iconX + 34} ${iconY + 26} L ${iconX + 44} ${iconY + 26}" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="${strokeOpacity * 1.1}"/>

  <!-- Centered message text: bigger, bolded, and dimmer -->
  <text x="${centerX}" y="${centerY + 24}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', sans-serif" font-size="16" font-weight="600" fill="${textColor}">${escapeXml(message)}</text>
</svg>
  `.trim();

  return svgToDataUri(svg);
}
