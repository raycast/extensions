import { formatMoney } from "../lib/format";
import { BOTTOM_BAND, emptyChart, num, textEl, TOP_BAND } from "./shared";
import { svgDocument } from "./svg";
import { chartTheme, type Appearance } from "./theme";

const GAP = 6;

export function renderMonthlyBars(
  months: { label: string; value: number }[],
  opts: {
    width: number;
    height: number;
    appearance: Appearance;
    currency: string;
    /** Shown when no month has a value. */
    emptyMessage?: string;
  },
): string {
  const { width, height, appearance, currency, emptyMessage = "No dividends yet" } = opts;
  const theme = chartTheme(appearance);
  const max = Math.max(0, ...months.map((m) => m.value));
  if (!months.length || max <= 0) return emptyChart(theme, width, height, emptyMessage);

  const n = months.length;
  const bw = (width - GAP * (n - 1)) / n;
  const top = TOP_BAND;
  const bottom = height - BOTTOM_BAND;
  let inner = "";
  months.forEach((m, i) => {
    const bx = i * (bw + GAP);
    const h = (Math.max(0, m.value) / max) * (bottom - top);
    const fill = i === n - 1 ? theme.up : theme.mutedBar;
    inner += `<rect x="${num(bx)}" y="${num(bottom - h)}" width="${num(bw)}" height="${num(h)}" rx="2" fill="${fill}"/>`;
    inner += textEl(theme, bx + bw / 2, height - 2, "middle", m.label.charAt(0), theme.mutedText);
  });
  inner += textEl(theme, 0, 11, "start", `${formatMoney(max, currency, { decimals: 0 })} peak`, theme.mutedText);
  return svgDocument(inner, width, height);
}
