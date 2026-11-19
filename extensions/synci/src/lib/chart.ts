import Decimal from "decimal.js";
import { dateLabel, decimal, money } from "./format";
import { calendarDay, type HistoryPoint } from "./balance-history";

export function escapeSvg(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Local SVG: actual calendar spacing, a labelled scale, and no external image service. */
export function historyChart(points: HistoryPoint[], currency: string, dark: boolean): string | undefined {
  if (points.length < 2 || points.some((point) => !calendarDay(point.date) || !decimal(point.amount))) return undefined;
  const dates = points.map((point) => Date.parse(`${point.date}T12:00:00Z`));
  if (dates.some((date, index) => index > 0 && date <= dates[index - 1])) return undefined;
  const values = points.map((point) => new Decimal(point.amount));
  const low = Decimal.min(...values);
  const high = Decimal.max(...values);
  const spread = high.minus(low);
  const padding = spread.isZero() ? Decimal.max(low.abs().times(0.01), 1) : spread.times(0.12);
  const min = low.minus(padding);
  const max = high.plus(padding);
  const width = 760,
    left = 112,
    right = 742,
    top = 24,
    bottom = 218,
    height = 260;
  const green = dark ? "#34D399" : "#059669";
  const text = dark ? "#A9AFB8" : "#626B75";
  const grid = dark ? "#FFFFFF" : "#000000";
  const x = (index: number) => left + ((dates[index] - dates[0]) / (dates.at(-1)! - dates[0])) * (right - left);
  const y = (value: Decimal) => bottom - value.minus(min).div(max.minus(min)).toNumber() * (bottom - top);
  const path = values
    .map((value, index) => `${index ? "L" : "M"}${x(index).toFixed(2)},${y(value).toFixed(2)}`)
    .join(" ");
  const label = (x: number, y: number, value: string, anchor = "start") =>
    `<text x="${x}" y="${y}" fill="${text}" font-size="12" font-family="system-ui, sans-serif" text-anchor="${anchor}">${escapeSvg(value)}</text>`;
  const scale = (spread.isZero() ? [high] : [high, low.plus(high).div(2), low])
    .map(
      (value) =>
        `<path d="M${left},${y(value).toFixed(2)} H${right}" stroke="${grid}" stroke-opacity="0.09"/>` +
        label(left - 12, y(value) + 4, money(value.toFixed(), currency), "end"),
    )
    .join("");
  const indices = [0, points.length - 1];
  const middle = dates.findIndex((date) => date >= (dates[0] + dates.at(-1)!) / 2);
  if (middle > 0 && middle < points.length - 1 && x(middle) > left + 150 && x(middle) < right - 150)
    indices.splice(1, 0, middle);
  const labels = indices
    .map((index) =>
      label(
        x(index),
        248,
        dateLabel(points[index].date),
        index === 0 ? "start" : index === points.length - 1 ? "end" : "middle",
      ),
    )
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${green}" stop-opacity="0.25"/><stop offset="1" stop-color="${green}" stop-opacity="0.02"/></linearGradient></defs>
    ${scale}<path d="${path} L${right},${bottom} L${left},${bottom} Z" fill="url(#area)"/>
    <path d="${path}" fill="none" stroke="${green}" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="${right}" cy="${y(values.at(-1)!).toFixed(2)}" r="3" fill="${green}"/>${labels}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
