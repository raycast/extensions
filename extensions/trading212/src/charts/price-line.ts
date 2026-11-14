import { formatPrice } from "../lib/format";
import type { ChartRange } from "../lib/yahoo/chart";
import { BOTTOM_BAND, emptyChart, formatChartDate, num, textEl, TOP_BAND } from "./shared";
import { svgDocument } from "./svg";
import { chartTheme, type Appearance } from "./theme";

export function renderPriceChart(
  points: { t: number; close: number }[],
  opts: {
    width: number;
    height: number;
    appearance: Appearance;
    currency: string;
    range: ChartRange;
    avgPrice?: number | null;
  },
): string {
  const { width, height, appearance, currency, range } = opts;
  const theme = chartTheme(appearance);
  if (points.length < 2) return emptyChart(theme, width, height, "Price chart unavailable");

  const closes = points.map((p) => p.close);
  const high = Math.max(...closes);
  const low = Math.min(...closes);
  const avg = opts.avgPrice != null && Number.isFinite(opts.avgPrice) ? opts.avgPrice : null;
  const lo = avg === null ? low : Math.min(low, avg);
  const hi = avg === null ? high : Math.max(high, avg);
  const span = hi - lo || 1;
  const top = TOP_BAND;
  const bottom = height - BOTTOM_BAND;
  const y = (v: number) => bottom - ((v - lo) / span) * (bottom - top);
  const x = (i: number) => (i / (points.length - 1)) * width;

  const color = closes[closes.length - 1] >= closes[0] ? theme.up : theme.down;
  const line = closes.map((c, i) => `${i === 0 ? "M" : "L"}${num(x(i))},${num(y(c))}`).join(" ");
  const cornerLabel = (text: string, anchor: "start" | "end", baseline: number) =>
    textEl(theme, anchor === "start" ? 0 : width, baseline, anchor, text, theme.mutedText);

  let inner = `<defs><linearGradient id="pf-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity="0.28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>`;
  inner += `<path d="${line} L${num(width)},${num(bottom)} L0,${num(bottom)} Z" fill="url(#pf-grad)"/>`;
  if (avg !== null) {
    const ay = y(avg);
    inner += `<line x1="0" x2="${num(width)}" y1="${num(ay)}" y2="${num(ay)}" stroke="${theme.mutedText}" stroke-width="1" stroke-dasharray="4 4"/>`;
    const labelY = Math.min(bottom - 2, Math.max(top + 10, ay - 3));
    inner += textEl(theme, width, labelY, "end", `avg ${formatPrice(avg, currency)}`, theme.mutedText);
  }
  inner += `<path d="${line}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>`;
  inner += cornerLabel(`High ${formatPrice(high, currency)}`, "start", 11);
  inner += cornerLabel(`Low ${formatPrice(low, currency)}`, "end", 11);
  inner += cornerLabel(formatChartDate(points[0].t, range), "start", height - 2);
  inner += cornerLabel(formatChartDate(points[points.length - 1].t, range), "end", height - 2);
  return svgDocument(inner, width, height);
}
