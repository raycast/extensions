import { formatMoneyCompact } from "../lib/format";
import { BOTTOM_BAND, emptyChart, num, textEl, TOP_BAND } from "./shared";
import { svgDocument } from "./svg";
import { chartTheme, type Appearance } from "./theme";

const GAP = 4;

/**
 * Net money deposited per month: this month in the accent color, earlier months muted, months with
 * more withdrawn than deposited dipping below the axis in red. A dashed line marks the monthly
 * average (top-left legend) and this month's amount is labelled top-right.
 */
export function renderDepositBars(
  months: { key: string; value: number }[],
  opts: { width: number; height: number; appearance: Appearance; currency: string },
): string {
  const { width, height, appearance, currency } = opts;
  const theme = chartTheme(appearance);
  if (!months.length || months.every((m) => m.value === 0)) return emptyChart(theme, width, height, "No deposits yet");

  const n = months.length;
  const bw = (width - GAP * (n - 1)) / n;
  const top = TOP_BAND + 4;
  const bottom = height - BOTTOM_BAND;
  const max = Math.max(0, ...months.map((m) => m.value));
  const min = Math.min(0, ...months.map((m) => m.value));
  const scale = (bottom - top) / (max - min || 1);
  const zero = bottom + min * scale;

  let inner = "";
  months.forEach((m, i) => {
    const x = i * (bw + GAP);
    const h = Math.max(1, Math.abs(m.value) * scale);
    const y = m.value >= 0 ? zero - h : zero;
    const fill = m.value < 0 ? theme.down : i === n - 1 ? theme.accent : theme.accentMuted;
    inner += `<rect x="${num(x)}" y="${num(y)}" width="${num(bw)}" height="${num(h)}" rx="2.5" fill="${fill}"/>`;
    if (m.key.endsWith("-01")) inner += textEl(theme, x, height - 3, "start", m.key.slice(0, 4), theme.mutedText);
  });
  inner += `<line x1="0" x2="${width}" y1="${num(zero)}" y2="${num(zero)}" stroke="${theme.gridLine}"/>`;

  const avg = months.reduce((s, m) => s + m.value, 0) / n;
  if (avg > 0) {
    const ay = zero - avg * scale;
    const dash = `stroke="${theme.mutedText}" stroke-dasharray="3 4" stroke-width="1"`;
    inner += `<line x1="0" x2="${width}" y1="${num(ay)}" y2="${num(ay)}" ${dash}/>`;
    inner += `<line x1="0" x2="14" y1="7" y2="7" ${dash}/>`;
    inner += textEl(theme, 20, 11, "start", `avg ${formatMoneyCompact(avg, currency)} / month`, theme.mutedText, 10.5);
  }
  inner += textEl(
    theme,
    width,
    11,
    "end",
    `${formatMoneyCompact(months[n - 1].value, currency)} this month`,
    theme.text,
    10.5,
    600,
  );
  return svgDocument(inner, width, height);
}
