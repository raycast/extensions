import type { PeriodKey } from "./format";
import { formatNumber, formatTokens } from "./format";
import type { DateRange, UsageEvent } from "./types";

export type UsageBucket = { label: string; tokens: number };

const Y_AXIS_TITLE = "Tokens";

/** Nudge chart left to line up with Detail.Metadata label column. */
const CHART_SHIFT_LEFT = 18;

const CHART_W = 384;
const CHART_H = 172;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

export function bucketDetailLabel(period: PeriodKey, b: UsageBucket): string {
  const tok = formatTokens(b.tokens);
  if (period === "today") return `${b.label}:00 — ${tok}`;
  if (period === "week") return `${b.label} — ${tok}`;
  return `Day ${b.label} — ${tok}`;
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

type BarLabelPlacement = {
  index: number;
  text: string;
  cx: number;
  /** SVG rotate(-90) anchor at vertical center of bar. */
  anchorY: number;
};

function planBarLabels(
  geoms: BarGeom[],
  opts: { n: number },
): BarLabelPlacement[] {
  const fontSize = opts.n > 14 ? 8 : 9;
  const pad = 8;
  /** Minimum bar height to attempt a vertical in-bar label. */
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

/** Calendar-aligned buckets for the given period (local time). */
export function buildUsageBuckets(
  period: PeriodKey,
  range: DateRange,
  events: UsageEvent[],
): UsageBucket[] {
  const startMs = range.start.getTime();
  const endMs = range.end.getTime();
  const inRange = events.filter((e) => {
    const t = e.timestamp.getTime();
    return t >= startMs && t <= endMs;
  });

  if (period === "today") {
    /** Eight 3-hour windows across the day (local time). */
    const blocks = 8;
    const hoursPer = 24 / blocks;
    const arr: UsageBucket[] = Array.from({ length: blocks }, (_, i) => ({
      /** Start hour of each 3h window — short labels avoid x-axis overlap. */
      label: String(Math.round(i * hoursPer)),
      tokens: 0,
    }));
    for (const e of inRange) {
      const h = e.timestamp.getHours();
      const m = e.timestamp.getMinutes();
      const frac = h + m / 60;
      const idx = Math.min(Math.floor(frac / hoursPer), blocks - 1);
      arr[idx].tokens += e.totalTokens;
    }
    return arr;
  }

  const days: { label: string; dayStart: number; tokens: number }[] = [];
  const d = new Date(range.start);
  d.setHours(0, 0, 0, 0);
  const endDay = new Date(range.end);
  endDay.setHours(0, 0, 0, 0);

  while (d.getTime() <= endDay.getTime()) {
    const label =
      period === "week"
        ? new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(d)
        : String(d.getDate());
    days.push({ label, dayStart: d.getTime(), tokens: 0 });
    d.setDate(d.getDate() + 1);
  }

  for (const e of inRange) {
    const day = new Date(e.timestamp);
    day.setHours(0, 0, 0, 0);
    const t = day.getTime();
    const bucket = days.find((b) => b.dayStart === t);
    if (bucket) bucket.tokens += e.totalTokens;
  }

  return days.map(({ label, tokens }) => ({ label, tokens }));
}

function xAxisTitleForPeriod(period: PeriodKey): string {
  if (period === "today") return "Hour (3h)";
  if (period === "week") return "Day";
  return "Day of month";
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
  const n = Math.max(buckets.length, 1);

  const padR = 10;
  const plotTop = 28;
  const axisTitleSize = 11;
  const axisTickSize = 10;
  const marginBottom = 6;
  /** Shared gaps: axis title ↔ tick labels ↔ plot edge (both axes). */
  const gapTitleTicks = 10;
  const gapTicksPlot = 8;

  const xTitleY = CHART_H - marginBottom;
  const xLabelRowY = xTitleY - gapTitleTicks - axisTickSize;
  const baselineY = xLabelRowY - gapTicksPlot - axisTickSize / 2;
  const plotH = baselineY - plotTop;

  const yTitleColumn = axisTitleSize + 4;
  const yTitleX = yTitleColumn / 2;
  const yTickLabelMaxW = Math.max(
    ...ticks.map((tv) =>
      estimateSvgTextWidth(formatAxisTick(tv), axisTickSize),
    ),
  );
  const plotLeft = yTitleColumn + gapTitleTicks + yTickLabelMaxW + gapTicksPlot;
  const yTickX = plotLeft - gapTicksPlot;
  const plotWActual = CHART_W - plotLeft - padR;

  /** Few buckets (typical week Mon–Fri): cap bar width, widen gaps, center cluster. */
  const minGap =
    n <= 5 ? 14 : n <= 8 ? 11 : n <= 10 ? 8 : n <= 14 ? 4 : n <= 24 ? 2 : 3;
  const maxBarW = n <= 5 ? 18 : n <= 8 ? 22 : n <= 12 ? 28 : n <= 18 ? 34 : 48;

  const gap = minGap;
  let barW = Math.max(1, (plotWActual - gap * (n - 1)) / n);
  if (barW > maxBarW) barW = maxBarW;
  const barOriginX = plotLeft;

  const labelStep = n > 22 ? Math.ceil(n / 9) : n > 14 ? 2 : 1;

  const xAxisTitle = xAxisTitleForPeriod(period);
  const midY = (plotTop + baselineY) / 2;

  const viewW = CHART_W + CHART_SHIFT_LEFT;
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CHART_W}" height="${CHART_H}" viewBox="${-CHART_SHIFT_LEFT} 0 ${viewW} ${CHART_H}" preserveAspectRatio="xMinYMid meet">`,
    `<rect width="100%" height="100%" fill="transparent"/>`,
    `<g transform="translate(${-CHART_SHIFT_LEFT}, 0)">`,
    `<text transform="translate(${yTitleX.toFixed(1)} ${midY.toFixed(1)}) rotate(-90)" fill="#AEAEB2" font-size="${axisTitleSize}" font-family="system-ui,-apple-system,sans-serif" text-anchor="middle" dominant-baseline="middle">${Y_AXIS_TITLE}</text>`,
    `<line x1="${plotLeft}" y1="${plotTop}" x2="${plotLeft}" y2="${baselineY}" stroke="#5C5C5F" stroke-width="1"/>`,
    `<line x1="${plotLeft}" y1="${baselineY}" x2="${CHART_W - padR}" y2="${baselineY}" stroke="#5C5C5F" stroke-width="1"/>`,
  ];

  for (const tv of ticks) {
    const ty = baselineY - (tv / axisMax) * plotH;
    if (tv > 0) {
      parts.push(
        `<line x1="${plotLeft}" y1="${ty.toFixed(1)}" x2="${CHART_W - padR}" y2="${ty.toFixed(1)}" stroke="#3A3A3C" stroke-width="1"/>`,
      );
    }
    parts.push(
      `<text x="${yTickX.toFixed(1)}" y="${ty.toFixed(1)}" fill="#AEAEB2" font-size="${axisTickSize}" font-family="system-ui,-apple-system,sans-serif" text-anchor="end" dominant-baseline="middle">${escapeXml(formatAxisTick(tv))}</text>`,
    );
  }

  const barGeoms: BarGeom[] = buckets.map((b, i) => {
    const h = (b.tokens / axisMax) * plotH;
    const bh = Math.max(h, b.tokens > 0 ? 2 : 0);
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

  barGeoms.forEach(({ x, y, bh }) => {
    parts.push(
      `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${barW.toFixed(2)}" height="${bh.toFixed(2)}" rx="2" fill="${escapeXml(brandHex)}" fill-opacity="0.88"/>`,
    );
  });

  const barLabelFont = n > 14 ? 8 : 9;
  const labelPlacements = planBarLabels(barGeoms, { n });

  for (const lp of labelPlacements) {
    parts.push(
      `<text transform="translate(${lp.cx.toFixed(2)}, ${lp.anchorY.toFixed(2)}) rotate(-90)" text-anchor="middle" dominant-baseline="middle" fill="#FFFFFF" fill-opacity="0.95" font-size="${barLabelFont}" font-weight="600" font-family="system-ui,-apple-system,sans-serif">${escapeXml(lp.text)}</text>`,
    );
  }

  const xTickFont = period === "today" ? 9 : axisTickSize;

  buckets.forEach((b, i) => {
    const show = i % labelStep === 0 || i === n - 1;
    if (!show) return;
    const x = barOriginX + i * (barW + gap) + barW / 2;
    parts.push(
      `<text x="${x.toFixed(1)}" y="${xLabelRowY}" text-anchor="middle" fill="#AEAEB2" font-size="${xTickFont}" font-family="system-ui,-apple-system,sans-serif">${escapeXml(b.label)}</text>`,
    );
  });

  parts.push(
    `<text x="${((plotLeft + CHART_W - padR) / 2).toFixed(1)}" y="${xTitleY}" text-anchor="middle" fill="#C7C7CC" font-size="${axisTitleSize}" font-family="system-ui,-apple-system,sans-serif">${escapeXml(xAxisTitle)}</text>`,
  );

  parts.push(`</g>`, `</svg>`);
  return wrapChartMarkdown(parts.join(""), CHART_W, CHART_H);
}
