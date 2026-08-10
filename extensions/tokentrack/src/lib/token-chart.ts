import { adjustHex, chartFillHex } from "./chart-color";
import type { PeriodKey } from "./format";
import { formatNumber, formatTokens } from "./format";
import type { DateRange, UsageEvent } from "./types";

export type UsageBucket = { label: string; tokens: number };

const Y_AXIS_TITLE = "Tokens";

/** Nudge chart left to line up with Detail.Metadata label column. */
const CHART_SHIFT_LEFT = 22;

const CHART_W = 384;
const CHART_H = 172;

const PLOT_BG = "#2C2C2E";
const GRID_STROKE = "#3A3A3C";
const AXIS_STROKE = "#5C5C5F";
const ZERO_BAR_FILL = "#48484A";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Bar with rounded top corners only. */
function roundedTopBarPath(
  x: number,
  y: number,
  w: number,
  h: number,
  rx: number,
): string {
  if (h <= 0) return "";
  // Scale radius with bar height so tiny usage days stay flat-topped, not dome-shaped.
  const r = Math.min(rx, w / 2, h * 0.35);
  if (r < 0.75) {
    return [
      `M ${x.toFixed(2)} ${y.toFixed(2)}`,
      `L ${(x + w).toFixed(2)} ${y.toFixed(2)}`,
      `L ${(x + w).toFixed(2)} ${(y + h).toFixed(2)}`,
      `L ${x.toFixed(2)} ${(y + h).toFixed(2)}`,
      "Z",
    ].join(" ");
  }
  return [
    `M ${x.toFixed(2)} ${(y + h).toFixed(2)}`,
    `L ${x.toFixed(2)} ${(y + r).toFixed(2)}`,
    `A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${(x + r).toFixed(2)} ${y.toFixed(2)}`,
    `L ${(x + w - r).toFixed(2)} ${y.toFixed(2)}`,
    `A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${(x + w).toFixed(2)} ${(y + r).toFixed(2)}`,
    `L ${(x + w).toFixed(2)} ${(y + h).toFixed(2)}`,
    "Z",
  ].join(" ");
}

/** Rounded tick labels for the Y-axis (e.g. 20M, 40M — not 16.6M). */
function formatAxisTick(value: number): string {
  if (value <= 0) return "0";
  if (value >= 1_000_000) return `${Math.round(value / 1_000_000)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return formatNumber(value);
}

/** Pick a round axis max and tick step (Wilkinson-style nice numbers). */
function niceAxisScale(
  dataMax: number,
  targetIntervals = 4,
): { axisMax: number; ticks: number[] } {
  if (dataMax <= 0) return { axisMax: 1, ticks: [0, 1] };

  const niceMultiples = [1, 2, 2.5, 5, 10];
  const exp = Math.floor(Math.log10(dataMax));
  const magnitude = Math.pow(10, exp);
  const norm = dataMax / (targetIntervals * magnitude);

  let niceNorm = 10;
  for (const m of niceMultiples) {
    if (m >= norm) {
      niceNorm = m;
      break;
    }
  }

  const step = niceNorm * magnitude;
  const axisMax = Math.ceil(dataMax / step) * step;

  const ticks: number[] = [];
  for (let v = 0; v <= axisMax + step * 1e-9; v += step) {
    ticks.push(v);
  }
  return { axisMax, ticks };
}

/** Approximate rendered width for SVG text (system-ui, no canvas). */
function estimateSvgTextWidth(text: string, fontSize: number): number {
  let w = 0;
  for (const ch of text) {
    if (ch === "." || ch === ",") w += fontSize * 0.28;
    else if (ch === "M" || ch === "K") w += fontSize * 0.62;
    else w += fontSize * 0.48;
  }
  return w;
}

export function bucketDetailLabel(b: UsageBucket): string {
  return `${b.label} — ${formatTokens(b.tokens)}`;
}

/** Shortest token string that fits vertically inside the bar (top-to-bottom label). */
function compactBarLabelVertical(
  tokens: number,
  availHeight: number,
  fontSize: number,
): string | null {
  if (tokens <= 0 || availHeight < fontSize + 4) return null;
  const candidates = [
    tokens >= 1_000_000 ? `${Math.round(tokens / 1_000_000)}M` : null,
    formatTokens(tokens),
    tokens >= 1_000 ? `${Math.round(tokens / 1_000)}K` : null,
  ].filter((c): c is string => c != null);
  for (const c of candidates) {
    if (estimateSvgTextWidth(c, fontSize) <= availHeight) return c;
  }
  return null;
}

type BarGeom = {
  index: number;
  x: number;
  y: number;
  bh: number;
  cx: number;
  tokens: number;
};

type PointGeom = {
  index: number;
  cx: number;
  cy: number;
  tokens: number;
};

type BarLabelPlacement = {
  index: number;
  text: string;
  cx: number;
  /** SVG rotate(-90) anchor at vertical center of bar. */
  anchorY: number;
};

type ChartLayout = {
  n: number;
  axisMax: number;
  ticks: number[];
  padR: number;
  plotTop: number;
  axisTitleSize: number;
  axisTickSize: number;
  xTitleY: number;
  xLabelRowY: number;
  baselineY: number;
  plotH: number;
  plotLeft: number;
  yTickX: number;
  plotWActual: number;
  barW: number;
  gap: number;
  barOriginX: number;
  labelStep: number;
  midY: number;
  yTitleX: number;
};

function computeChartLayout(
  buckets: UsageBucket[],
  axisMax: number,
  ticks: number[],
): ChartLayout {
  const n = Math.max(buckets.length, 1);

  const padR = 10;
  const plotTop = 28;
  const axisTitleSize = 11;
  const axisTickSize = 10;
  const marginBottom = 6;
  const gapTitleTicks = 10;
  const gapTicksPlot = 8;
  /** Space between the y-axis line and the first bar / point. */
  const dataPadLeft = 12;

  const xTitleY = CHART_H - marginBottom;
  const xLabelRowY = xTitleY - gapTitleTicks - axisTickSize;
  const baselineY = xLabelRowY - gapTicksPlot - axisTickSize / 2;
  const plotH = baselineY - plotTop;

  const yTitleColumn = axisTitleSize + 4;
  /** Left of the y-axis tick labels — keep "Tokens" tucked toward the chart edge. */
  const yTitleX = 5;
  const yTickLabelMaxW = Math.max(
    ...ticks.map((tv) =>
      estimateSvgTextWidth(formatAxisTick(tv), axisTickSize),
    ),
  );
  const plotLeft = yTitleColumn + gapTitleTicks + yTickLabelMaxW + gapTicksPlot;
  const yTickX = plotLeft - gapTicksPlot;
  const plotWActual = CHART_W - plotLeft - padR - dataPadLeft;

  const minGap =
    n <= 5 ? 14 : n <= 8 ? 11 : n <= 10 ? 8 : n <= 14 ? 4 : n <= 24 ? 2 : 3;
  const maxBarW = n <= 5 ? 18 : n <= 8 ? 22 : n <= 12 ? 28 : n <= 18 ? 34 : 48;

  const gap = minGap;
  let barW = Math.max(1, (plotWActual - gap * (n - 1)) / n);
  if (barW > maxBarW) barW = maxBarW;

  const labelStep = n > 22 ? Math.ceil(n / 9) : n > 14 ? 2 : 1;
  const midY = (plotTop + baselineY) / 2;

  return {
    n,
    axisMax,
    ticks,
    padR,
    plotTop,
    axisTitleSize,
    axisTickSize,
    xTitleY,
    xLabelRowY,
    baselineY,
    plotH,
    plotLeft,
    yTickX,
    plotWActual,
    barW,
    gap,
    barOriginX: plotLeft + dataPadLeft,
    labelStep,
    midY,
    yTitleX,
  };
}

function peakBucketIndex(buckets: UsageBucket[]): number {
  let peak = 0;
  for (let i = 1; i < buckets.length; i++) {
    if (buckets[i].tokens > buckets[peak].tokens) peak = i;
  }
  return peak;
}

function chartGradientDefs(fillHex: string): string {
  const dark = adjustHex(fillHex, 0.72);
  const bright = adjustHex(fillHex, 1.06);
  return [
    "<defs>",
    `<linearGradient id="barGrad" x1="0" y1="1" x2="0" y2="0">`,
    `<stop offset="0%" stop-color="${escapeXml(dark)}" stop-opacity="0.9"/>`,
    `<stop offset="100%" stop-color="${escapeXml(fillHex)}" stop-opacity="1"/>`,
    `</linearGradient>`,
    `<linearGradient id="peakGrad" x1="0" y1="1" x2="0" y2="0">`,
    `<stop offset="0%" stop-color="${escapeXml(fillHex)}" stop-opacity="0.95"/>`,
    `<stop offset="100%" stop-color="${escapeXml(bright)}" stop-opacity="1"/>`,
    `</linearGradient>`,
    `<linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">`,
    `<stop offset="0%" stop-color="${escapeXml(fillHex)}" stop-opacity="0.42"/>`,
    `<stop offset="85%" stop-color="${escapeXml(fillHex)}" stop-opacity="0.08"/>`,
    `<stop offset="100%" stop-color="${escapeXml(fillHex)}" stop-opacity="0"/>`,
    `</linearGradient>`,
    "</defs>",
  ].join("");
}

function renderPlotBackground(layout: ChartLayout): string {
  const { plotLeft, plotTop, baselineY, padR } = layout;
  const pad = 4;
  const plotRight = CHART_W - padR;
  return `<rect x="${(plotLeft - pad).toFixed(1)}" y="${(plotTop - pad).toFixed(1)}" width="${(plotRight - plotLeft + pad).toFixed(1)}" height="${(baselineY - plotTop + pad).toFixed(1)}" rx="7" fill="${PLOT_BG}" fill-opacity="0.5"/>`;
}

function renderAxesAndGrid(layout: ChartLayout, xAxisTitle: string): string[] {
  const {
    plotLeft,
    plotTop,
    baselineY,
    padR,
    axisTitleSize,
    axisTickSize,
    ticks,
    axisMax,
    plotH,
    yTickX,
    yTitleX,
    midY,
    xTitleY,
  } = layout;

  const parts: string[] = [
    `<text transform="translate(${yTitleX.toFixed(1)} ${midY.toFixed(1)}) rotate(-90)" fill="#AEAEB2" font-size="${axisTitleSize}" font-family="system-ui,-apple-system,sans-serif" text-anchor="middle" dominant-baseline="middle">${Y_AXIS_TITLE}</text>`,
    `<line x1="${plotLeft}" y1="${plotTop}" x2="${plotLeft}" y2="${baselineY}" stroke="${AXIS_STROKE}" stroke-width="1" stroke-opacity="0.85"/>`,
    `<line x1="${plotLeft}" y1="${baselineY}" x2="${CHART_W - padR}" y2="${baselineY}" stroke="${AXIS_STROKE}" stroke-width="1" stroke-opacity="0.85"/>`,
  ];

  const gridTicks = ticks.filter((tv, i) => tv > 0 && i % 2 === 0);

  for (const tv of ticks) {
    const ty = baselineY - (tv / axisMax) * plotH;
    if (gridTicks.includes(tv)) {
      parts.push(
        `<line x1="${plotLeft}" y1="${ty.toFixed(1)}" x2="${CHART_W - padR}" y2="${ty.toFixed(1)}" stroke="${GRID_STROKE}" stroke-width="1" stroke-opacity="0.38"/>`,
      );
    }
    parts.push(
      `<text x="${yTickX.toFixed(1)}" y="${ty.toFixed(1)}" fill="#AEAEB2" font-size="${axisTickSize}" font-family="system-ui,-apple-system,sans-serif" text-anchor="end" dominant-baseline="middle">${escapeXml(formatAxisTick(tv))}</text>`,
    );
  }

  parts.push(
    `<text x="${((plotLeft + CHART_W - padR) / 2).toFixed(1)}" y="${xTitleY}" text-anchor="middle" fill="#C7C7CC" font-size="${axisTitleSize}" font-family="system-ui,-apple-system,sans-serif">${escapeXml(xAxisTitle)}</text>`,
  );

  return parts;
}

function renderXLabels(buckets: UsageBucket[], layout: ChartLayout): string[] {
  const { n, barOriginX, barW, gap, labelStep, xLabelRowY, axisTickSize } =
    layout;
  const parts: string[] = [];

  buckets.forEach((b, i) => {
    const show = i % labelStep === 0 || i === n - 1;
    if (!show) return;
    const x = barOriginX + i * (barW + gap) + barW / 2;
    parts.push(
      `<text x="${x.toFixed(1)}" y="${xLabelRowY}" text-anchor="middle" fill="#AEAEB2" font-size="${axisTickSize}" font-family="system-ui,-apple-system,sans-serif">${escapeXml(b.label)}</text>`,
    );
  });

  return parts;
}

function planBarLabels(
  geoms: BarGeom[],
  opts: { n: number },
): BarLabelPlacement[] {
  const fontSize = opts.n > 14 ? 8 : 9;
  const pad = 8;
  const minBarH = fontSize + pad + 4;

  const result: BarLabelPlacement[] = [];

  for (const g of geoms) {
    if (g.tokens <= 0 || g.bh < minBarH) continue;

    const availH = g.bh - pad;
    const text = compactBarLabelVertical(g.tokens, availH, fontSize);
    if (!text) continue;

    result.push({
      index: g.index,
      text,
      cx: g.cx,
      anchorY: g.y + g.bh / 2,
    });
  }

  return result;
}

function renderBarSeries(
  buckets: UsageBucket[],
  layout: ChartLayout,
  peakIndex: number,
): string[] {
  const { n, axisMax, plotH, baselineY, barOriginX, barW, gap } = layout;
  const barRx = Math.min(4, barW / 2);
  const zeroBarH = 3;
  const parts: string[] = [];

  const barGeoms: BarGeom[] = buckets.map((b, i) => {
    const h = (b.tokens / axisMax) * plotH;
    const bh = b.tokens > 0 ? Math.max(h, 2) : zeroBarH;
    const x = barOriginX + i * (barW + gap);
    return {
      index: i,
      x,
      y: baselineY - bh,
      bh,
      cx: x + barW / 2,
      tokens: b.tokens,
    };
  });

  for (const g of barGeoms) {
    const isPeak = g.index === peakIndex && g.tokens > 0;
    const isZero = g.tokens <= 0;

    if (isZero) {
      parts.push(
        `<rect x="${g.x.toFixed(2)}" y="${(baselineY - zeroBarH).toFixed(2)}" width="${barW.toFixed(2)}" height="${zeroBarH}" rx="1.5" fill="${ZERO_BAR_FILL}" fill-opacity="0.35"/>`,
      );
      continue;
    }

    parts.push(
      `<path d="${roundedTopBarPath(g.x, g.y, barW, g.bh, barRx)}" fill="${isPeak ? "url(#peakGrad)" : "url(#barGrad)"}"/>`,
    );
  }

  const barLabelFont = n > 14 ? 8 : 9;
  const labelPlacements = planBarLabels(barGeoms, { n });

  for (const lp of labelPlacements) {
    parts.push(
      `<text transform="translate(${lp.cx.toFixed(2)}, ${lp.anchorY.toFixed(2)}) rotate(-90)" text-anchor="middle" dominant-baseline="middle" fill="#FFFFFF" fill-opacity="0.95" font-size="${barLabelFont}" font-weight="600" font-family="system-ui,-apple-system,sans-serif">${escapeXml(lp.text)}</text>`,
    );
  }

  return parts;
}

function renderAreaSeries(
  buckets: UsageBucket[],
  layout: ChartLayout,
  brandHex: string,
  peakIndex: number,
): string[] {
  const { axisMax, plotH, baselineY, barOriginX, barW, gap, plotLeft, padR } =
    layout;
  const parts: string[] = [];

  const points: PointGeom[] = buckets.map((b, i) => {
    const cx = barOriginX + i * (barW + gap) + barW / 2;
    const h = (b.tokens / axisMax) * plotH;
    const cy = b.tokens > 0 ? baselineY - Math.max(h, 2) : baselineY;
    return { index: i, cx, cy, tokens: b.tokens };
  });

  const plotRight = CHART_W - padR;
  const firstCx = points[0]?.cx ?? plotLeft;
  const lastCx = points[points.length - 1]?.cx ?? plotRight;

  const linePoints = points
    .map((p) => `${p.cx.toFixed(2)},${p.cy.toFixed(2)}`)
    .join(" ");

  const areaPath = [
    `M ${firstCx.toFixed(2)} ${baselineY.toFixed(2)}`,
    ...points.map((p) => `L ${p.cx.toFixed(2)} ${p.cy.toFixed(2)}`),
    `L ${lastCx.toFixed(2)} ${baselineY.toFixed(2)}`,
    "Z",
  ].join(" ");

  parts.push(`<path d="${areaPath}" fill="url(#areaGrad)"/>`);
  parts.push(
    `<polyline points="${linePoints}" fill="none" stroke="${escapeXml(brandHex)}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" stroke-opacity="0.92"/>`,
  );

  for (const p of points) {
    if (p.tokens <= 0) {
      parts.push(
        `<circle cx="${p.cx.toFixed(2)}" cy="${baselineY.toFixed(2)}" r="2" fill="${ZERO_BAR_FILL}" fill-opacity="0.45"/>`,
      );
      continue;
    }

    const isPeak = p.index === peakIndex;
    const r = isPeak ? 4.5 : 2.5;
    const strokeW = isPeak ? 2 : 0;

    if (isPeak) {
      parts.push(
        `<circle cx="${p.cx.toFixed(2)}" cy="${p.cy.toFixed(2)}" r="8" fill="${escapeXml(brandHex)}" fill-opacity="0.18"/>`,
      );
    }

    parts.push(
      `<circle cx="${p.cx.toFixed(2)}" cy="${p.cy.toFixed(2)}" r="${r}" fill="${isPeak ? escapeXml(adjustHex(brandHex, 1.2)) : escapeXml(brandHex)}" ${strokeW > 0 ? `stroke="#FFFFFF" stroke-width="${strokeW}" stroke-opacity="0.9"` : ""}/>`,
    );

    if (isPeak && p.tokens > 0) {
      const label = compactBarLabelVertical(p.tokens, 40, 9);
      if (label) {
        parts.push(
          `<text x="${p.cx.toFixed(2)}" y="${(p.cy - 12).toFixed(2)}" text-anchor="middle" fill="#FFFFFF" fill-opacity="0.92" font-size="9" font-weight="600" font-family="system-ui,-apple-system,sans-serif">${escapeXml(label)}</text>`,
        );
      }
    }
  }

  return parts;
}

function weekdayLabel(d: Date): string {
  return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(d);
}

function dayOfMonthLabel(d: Date): string {
  return String(d.getDate());
}

function bucketLabel(period: PeriodKey, d: Date): string {
  if (period === "week") return weekdayLabel(d);
  return dayOfMonthLabel(d);
}

/** Build chart buckets from a pre-aggregated daily map (dashboard snapshot path). */
export function buildUsageBucketsFromDaily(
  period: PeriodKey,
  range: DateRange,
  daily: Map<number, number>,
): UsageBucket[] {
  const buckets: UsageBucket[] = [];
  const d = new Date(range.start);
  d.setHours(0, 0, 0, 0);
  const endDay = new Date(range.end);
  endDay.setHours(0, 0, 0, 0);

  while (d.getTime() <= endDay.getTime()) {
    buckets.push({
      label: bucketLabel(period, d),
      tokens: daily.get(d.getTime()) ?? 0,
    });
    d.setDate(d.getDate() + 1);
  }

  return buckets;
}

/** Event-based buckets for lazy-loaded detail views. */
export function buildUsageBuckets(
  period: PeriodKey,
  range: DateRange,
  events: UsageEvent[],
): UsageBucket[] {
  const daily = new Map<number, number>();
  const startMs = range.start.getTime();
  const endMs = range.end.getTime();

  for (const e of events) {
    const t = e.timestamp.getTime();
    if (t < startMs || t > endMs) continue;
    const day = new Date(e.timestamp);
    day.setHours(0, 0, 0, 0);
    const key = day.getTime();
    daily.set(key, (daily.get(key) ?? 0) + e.totalTokens);
  }

  return buildUsageBucketsFromDaily(period, range, daily);
}

/** Raycast Detail only renders charts as markdown images, not inline SVG. */
function wrapChartMarkdown(svg: string, width: number, height: number): string {
  const b64 = Buffer.from(svg, "utf-8").toString("base64");
  return `\n![](data:image/svg+xml;base64,${b64}?raycast-width=${width}&raycast-height=${height})\n`;
}

/** Markdown embedding an SVG bar chart (Raycast Detail). */
export function renderTokenUsageChartMarkdown(
  period: PeriodKey,
  buckets: UsageBucket[],
  brandHex: string,
): string {
  const total = buckets.reduce((a, b) => a + b.tokens, 0);
  if (total <= 0) {
    const emptyH = 96;
    const emptySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CHART_W}" height="${emptyH}" viewBox="0 0 ${CHART_W} ${emptyH}" preserveAspectRatio="xMinYMid meet">
  <text x="0" y="${emptyH / 2 + 4}" fill="#636366" font-size="12" font-family="system-ui,-apple-system,sans-serif">No token usage in this period.</text>
</svg>`;
    return wrapChartMarkdown(emptySvg, CHART_W, emptyH);
  }

  const dataMax = Math.max(...buckets.map((b) => b.tokens), 1);
  const { axisMax, ticks } = niceAxisScale(dataMax);
  const layout = computeChartLayout(buckets, axisMax, ticks);
  const peakIndex = peakBucketIndex(buckets);
  const xAxisTitle = "Day";
  const useAreaChart = period === "month";
  const fillHex = chartFillHex(brandHex);

  const viewW = CHART_W + CHART_SHIFT_LEFT;
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CHART_W}" height="${CHART_H}" viewBox="${-CHART_SHIFT_LEFT} 0 ${viewW} ${CHART_H}" preserveAspectRatio="xMinYMid meet">`,
    `<rect width="100%" height="100%" fill="transparent"/>`,
    chartGradientDefs(fillHex),
    `<g transform="translate(${-CHART_SHIFT_LEFT}, 0)">`,
    renderPlotBackground(layout),
    ...renderAxesAndGrid(layout, xAxisTitle),
  ];

  if (useAreaChart) {
    parts.push(...renderAreaSeries(buckets, layout, fillHex, peakIndex));
  } else {
    parts.push(...renderBarSeries(buckets, layout, peakIndex));
  }

  parts.push(...renderXLabels(buckets, layout));
  parts.push(`</g>`, `</svg>`);

  return wrapChartMarkdown(parts.join(""), CHART_W, CHART_H);
}
