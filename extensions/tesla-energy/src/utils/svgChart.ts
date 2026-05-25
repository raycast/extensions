export interface ChartOptions {
  width?: number; // default: 500
  height?: number; // default: 120
  fillOpacity?: number; // default: 0.6
  gridlineColor?: string; // caller resolves: "#555555" dark, "#AAAAAA" light
  labelColor?: string; // axis label color, default: "#888888"
  xLabels?: string[]; // optional x-axis labels (shown at bottom)
  peakLabel?: string; // optional y-axis peak label (shown top-right)
}

// Extra bottom padding when x-axis labels are present
const X_LABEL_HEIGHT = 14;
// Extra top padding to place the peak label above the chart area
const PEAK_LABEL_HEIGHT = 14;

function escSvg(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function cubicBezierPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cpx1 = pts[i - 1].x + (pts[i].x - pts[i - 1].x) / 3;
    const cpy1 = pts[i - 1].y;
    const cpx2 = pts[i].x - (pts[i].x - pts[i - 1].x) / 3;
    const cpy2 = pts[i].y;
    d += ` C ${cpx1},${cpy1} ${cpx2},${cpy2} ${pts[i].x},${pts[i].y}`;
  }
  return d;
}

function toDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Returns evenly-spaced indices for x-axis label placement.
 * Always includes index 0 and the last index, then fills in between.
 */
function pickLabelIndices(n: number, maxLabels: number): number[] {
  if (n <= 1) return [0];
  if (n <= maxLabels) return Array.from({ length: n }, (_, i) => i);
  const indices: number[] = [0];
  const step = (n - 1) / (maxLabels - 1);
  for (let i = 1; i < maxLabels - 1; i++) {
    indices.push(Math.round(i * step));
  }
  indices.push(n - 1);
  return indices;
}

/**
 * Renders a filled area chart with a smooth bezier curve.
 * Used for day-view Solar and Home charts.
 */
export function areaChart(points: number[], color: string, options: ChartOptions = {}): string {
  const {
    width = 500,
    fillOpacity = 0.6,
    gridlineColor = "#555555",
    labelColor = "#AAAAAA",
    xLabels,
    peakLabel,
  } = options;
  const hasLabels = xLabels && xLabels.length > 0;
  const topPad = peakLabel ? PEAK_LABEL_HEIGHT : 0;
  const botPad = hasLabels ? X_LABEL_HEIGHT : 0;
  const chartHeight = (options.height ?? 120) - topPad - botPad;
  const totalHeight = chartHeight + topPad + botPad;
  const max = Math.max(...points, 1);
  const n = points.length;

  if (n === 0) {
    return toDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}"/>`);
  }

  if (n === 1) {
    const y = topPad + chartHeight - (points[0] / max) * (chartHeight - 4);
    return toDataUri(
      [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}">`,
        `  <line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="${escSvg(color)}" stroke-width="1.5"/>`,
        `</svg>`,
      ].join("\n"),
    );
  }

  const xs = points.map((_, i) => (i / (n - 1)) * width);
  const ys = points.map((v) => topPad + chartHeight - (v / max) * (chartHeight - 4));

  const d = cubicBezierPath(xs.map((x, i) => ({ x, y: ys[i] })));
  const fillPath = `${d} L ${xs[n - 1]},${topPad + chartHeight} L ${xs[0]},${topPad + chartHeight} Z`;
  const midY = topPad + chartHeight / 2;

  const labelEls: string[] = [];
  if (hasLabels) {
    const indices = pickLabelIndices(n, 6);
    for (const idx of indices) {
      if (xLabels[idx]) {
        const lx = Math.round(xs[idx]);
        const anchor = idx === 0 ? "start" : idx === n - 1 ? "end" : "middle";
        labelEls.push(
          `  <text x="${lx}" y="${totalHeight - 2}" font-size="9" fill="${escSvg(labelColor)}" text-anchor="${anchor}" font-family="sans-serif">${escSvg(xLabels[idx])}</text>`,
        );
      }
    }
  }

  const peakEl = peakLabel
    ? `  <text x="${width - 2}" y="${PEAK_LABEL_HEIGHT - 1}" font-size="9" fill="${escSvg(labelColor)}" text-anchor="end" font-family="sans-serif">${escSvg(peakLabel)}</text>`
    : "";

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}">`,
    `  <line x1="0" y1="${midY}" x2="${width}" y2="${midY}" stroke="${escSvg(gridlineColor)}" stroke-width="1" stroke-dasharray="4,4" opacity="0.4"/>`,
    `  <path d="${fillPath}" fill="${escSvg(color)}" fill-opacity="${fillOpacity}"/>`,
    `  <path d="${d}" fill="none" stroke="${escSvg(color)}" stroke-width="1.5"/>`,
    peakEl,
    ...labelEls,
    `</svg>`,
  ].join("\n");

  return toDataUri(svg);
}

/**
 * Renders a vertical bar chart with baseline at bottom.
 * Used for week/month/year Solar and Home charts.
 */
export function barChart(values: number[], color: string, options: ChartOptions = {}): string {
  const { width = 500, gridlineColor = "#555555", labelColor = "#AAAAAA", xLabels, peakLabel } = options;
  const hasLabels = xLabels && xLabels.length > 0;
  const topPad = peakLabel ? PEAK_LABEL_HEIGHT : 0;
  const botPad = hasLabels ? X_LABEL_HEIGHT : 0;
  const chartHeight = (options.height ?? 120) - topPad - botPad;
  const totalHeight = chartHeight + topPad + botPad;
  const max = Math.max(...values, 1);
  const n = values.length;

  if (n === 0) {
    return toDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}"/>`);
  }

  // Compute slot boundaries from integer pixel positions to ensure uniform bar widths.
  const slotLeft = (i: number) => Math.round((i / n) * width);
  const slotRight = (i: number) => Math.round(((i + 1) / n) * width);
  const slotW = slotRight(0) - slotLeft(0);
  const barW = Math.max(1, Math.floor(slotW * 0.85));
  const midY = topPad + chartHeight / 2;

  const bars = values
    .map((v, i) => {
      if (v <= 0) return "";
      const barH = Math.max(1, (v / max) * (chartHeight - 4));
      const x = slotLeft(i) + Math.floor((slotW - barW) / 2);
      const y = topPad + chartHeight - barH;
      return `  <rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="${escSvg(color)}" rx="2"/>`;
    })
    .join("\n");

  const labelEls: string[] = [];
  if (hasLabels) {
    // Render every non-empty label from the caller's array — callers pre-sparse the array.
    for (let idx = 0; idx < n; idx++) {
      if (xLabels[idx]) {
        const lx = Math.round(slotLeft(idx) + slotW / 2);
        const anchor = idx === 0 ? "start" : idx === n - 1 ? "end" : "middle";
        labelEls.push(
          `  <text x="${lx}" y="${totalHeight - 2}" font-size="9" fill="${escSvg(labelColor)}" text-anchor="${anchor}" font-family="sans-serif">${escSvg(xLabels[idx])}</text>`,
        );
      }
    }
  }

  const baselineY = topPad + chartHeight;
  const peakEl = peakLabel
    ? `  <text x="${width - 2}" y="${PEAK_LABEL_HEIGHT - 1}" font-size="9" fill="${escSvg(labelColor)}" text-anchor="end" font-family="sans-serif">${escSvg(peakLabel)}</text>`
    : "";

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}">`,
    `  <line x1="0" y1="${midY}" x2="${width}" y2="${midY}" stroke="${escSvg(gridlineColor)}" stroke-width="1" stroke-dasharray="4,4" opacity="0.4"/>`,
    `  <line x1="0" y1="${baselineY}" x2="${width}" y2="${baselineY}" stroke="${escSvg(labelColor)}" stroke-width="1" opacity="0.4"/>`,
    bars,
    peakEl,
    ...labelEls,
    `</svg>`,
  ].join("\n");

  return toDataUri(svg);
}

/**
 * Renders a bidirectional area/line chart anchored at a vertical midpoint.
 * Positive values fill upward (positiveColor), negative values fill downward (negativeColor).
 * Used for Powerwall and Grid day-view charts.
 */
export function biAreaChart(
  values: number[],
  positiveColor: string,
  negativeColor: string,
  options: ChartOptions = {},
): string {
  const { width = 500, fillOpacity = 0.6, labelColor = "#AAAAAA", xLabels, peakLabel } = options;
  const hasLabels = xLabels && xLabels.length > 0;
  const topPad = peakLabel ? PEAK_LABEL_HEIGHT : 0;
  const botPad = hasLabels ? X_LABEL_HEIGHT : 0;
  const chartHeight = (options.height ?? 120) - topPad - botPad;
  const totalHeight = chartHeight + topPad + botPad;
  const n = values.length;
  const midY = topPad + chartHeight / 2;
  const absMax = Math.max(...values.map(Math.abs), 1);

  if (n === 0) {
    return toDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}"/>`);
  }

  const xs = values.map((_, i) => (i / Math.max(n - 1, 1)) * width);
  const ys = values.map((v) => midY - (v / absMax) * (chartHeight / 2 - 2));

  const linePath = cubicBezierPath(xs.map((x, i) => ({ x, y: ys[i] })));
  const posLine = cubicBezierPath(xs.map((x, i) => ({ x, y: Math.min(ys[i], midY) })));
  const posFill = `${posLine} L ${xs[n - 1]},${midY} L ${xs[0]},${midY} Z`;
  const negLine = cubicBezierPath(xs.map((x, i) => ({ x, y: Math.max(ys[i], midY) })));
  const negFill = `${negLine} L ${xs[n - 1]},${midY} L ${xs[0]},${midY} Z`;

  const labelEls: string[] = [];
  if (hasLabels) {
    const indices = pickLabelIndices(n, 6);
    for (const idx of indices) {
      if (xLabels[idx]) {
        const lx = Math.round(xs[idx]);
        const anchor = idx === 0 ? "start" : idx === n - 1 ? "end" : "middle";
        labelEls.push(
          `  <text x="${lx}" y="${totalHeight - 2}" font-size="9" fill="${escSvg(labelColor)}" text-anchor="${anchor}" font-family="sans-serif">${escSvg(xLabels[idx])}</text>`,
        );
      }
    }
  }

  const peakEl = peakLabel
    ? `  <text x="${width - 2}" y="${PEAK_LABEL_HEIGHT - 1}" font-size="9" fill="${escSvg(labelColor)}" text-anchor="end" font-family="sans-serif">${escSvg(peakLabel)}</text>`
    : "";

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}">`,
    `  <defs>`,
    `    <clipPath id="clipAbove"><rect x="0" y="${topPad}" width="${width}" height="${midY - topPad}"/></clipPath>`,
    `    <clipPath id="clipBelow"><rect x="0" y="${midY}" width="${width}" height="${topPad + chartHeight - midY}"/></clipPath>`,
    `  </defs>`,
    `  <line x1="0" y1="${midY}" x2="${width}" y2="${midY}" stroke="${escSvg(labelColor)}" stroke-width="1" opacity="0.4"/>`,
    `  <path d="${posFill}" fill="${escSvg(positiveColor)}" fill-opacity="${fillOpacity}"/>`,
    `  <path d="${negFill}" fill="${escSvg(negativeColor)}" fill-opacity="${fillOpacity}"/>`,
    `  <path d="${linePath}" fill="none" stroke="${escSvg(positiveColor)}" stroke-width="1.5" opacity="0.9" clip-path="url(#clipAbove)"/>`,
    `  <path d="${linePath}" fill="none" stroke="${escSvg(negativeColor)}" stroke-width="1.5" opacity="0.9" clip-path="url(#clipBelow)"/>`,
    peakEl,
    ...labelEls,
    `</svg>`,
  ].join("\n");

  return toDataUri(svg);
}

/**
 * Renders a bidirectional vertical bar chart with baseline at vertical midpoint.
 * Positive values extend upward (positiveColor), negative values extend downward (negativeColor).
 * Used for Powerwall and Grid charts across all periods.
 */
export function biChart(
  values: number[],
  positiveColor: string,
  negativeColor: string,
  options: ChartOptions = {},
): string {
  const { width = 500, labelColor = "#AAAAAA", xLabels, peakLabel } = options;
  const hasLabels = xLabels && xLabels.length > 0;
  const topPad = peakLabel ? PEAK_LABEL_HEIGHT : 0;
  const botPad = hasLabels ? X_LABEL_HEIGHT : 0;
  const chartHeight = (options.height ?? 120) - topPad - botPad;
  const totalHeight = chartHeight + topPad + botPad;
  const absMax = Math.max(...values.map(Math.abs), 1);
  const n = values.length;
  const midY = topPad + chartHeight / 2;

  if (n === 0) {
    return toDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}"/>`);
  }

  const slotLeft = (i: number) => Math.round((i / n) * width);
  const slotRight = (i: number) => Math.round(((i + 1) / n) * width);
  const slotW = slotRight(0) - slotLeft(0);
  const barW = Math.max(1, Math.floor(slotW * 0.85));

  const bars = values
    .map((v, i) => {
      if (v === 0) return "";
      const barH = Math.max(1, (Math.abs(v) / absMax) * (chartHeight / 2 - 2));
      const x = slotLeft(i) + Math.floor((slotW - barW) / 2);
      const barColor = v > 0 ? positiveColor : negativeColor;
      const y = v > 0 ? midY - barH : midY;
      return `  <rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="${escSvg(barColor)}" rx="2"/>`;
    })
    .join("\n");

  const labelEls: string[] = [];
  if (hasLabels) {
    for (let idx = 0; idx < n; idx++) {
      if (xLabels[idx]) {
        const lx = Math.round(slotLeft(idx) + slotW / 2);
        const anchor = idx === 0 ? "start" : idx === n - 1 ? "end" : "middle";
        labelEls.push(
          `  <text x="${lx}" y="${totalHeight - 2}" font-size="9" fill="${escSvg(labelColor)}" text-anchor="${anchor}" font-family="sans-serif">${escSvg(xLabels[idx])}</text>`,
        );
      }
    }
  }

  const peakEl = peakLabel
    ? `  <text x="${width - 2}" y="${PEAK_LABEL_HEIGHT - 1}" font-size="9" fill="${escSvg(labelColor)}" text-anchor="end" font-family="sans-serif">${escSvg(peakLabel)}</text>`
    : "";

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}">`,
    // Zero axis at midY acts as both the gridline and the x-axis baseline
    `  <line x1="0" y1="${midY}" x2="${width}" y2="${midY}" stroke="${escSvg(labelColor)}" stroke-width="1" opacity="0.4"/>`,
    bars,
    peakEl,
    ...labelEls,
    `</svg>`,
  ].join("\n");

  return toDataUri(svg);
}
