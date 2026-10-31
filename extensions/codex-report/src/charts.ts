import { environment } from "@raycast/api";
import type { SvgImage } from "./png";
import { escapeXml, imageMarkdown } from "./svg";
export { escapeXml } from "./svg";

export type BarSegment = { label: string; value: number; color: string };
export type Bar = {
  label: string;
  value: number;
  group?: string;
  weekday?: string;
  segments?: BarSegment[];
  displayValue?: string;
};
export type ChartLegend = { label: string; color: string }[];
export const compact = (value: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);

export function barChartImage(title: string, bars: Bar[], legend: ChartLegend = []): SvgImage {
  const dark = environment.appearance === "dark";
  const text = dark ? "#eeeeee" : "#222222";
  const muted = dark ? "#999999" : "#666666";
  const track = dark ? "#303030" : "#eeeeee";
  const accent = dark ? "#228cf6" : "#0a7ff5";
  const max = Math.max(...bars.map((bar) => bar.value), 1);
  const barWidth = bars.some((bar) => bar.displayValue !== undefined) ? 220 : 280;
  const legendSvg = legend
    .map(
      (entry, index) =>
        `<circle cx="${index * 110 + 5}" cy="39" r="4" fill="${entry.color}"/><text x="${index * 110 + 16}" y="43" fill="${muted}" font-size="11">${escapeXml(entry.label)}</text>`,
    )
    .join("");
  let y = legend.length ? 69 : 40;
  const rows = bars
    .map((bar, index) => {
      let heading = "";
      if (bar.group) {
        if (index > 0) y += 12;
        heading = `<text x="0" y="${y}" fill="${muted}" font-size="11" font-weight="600">${escapeXml(bar.group)}</text>
        <line x1="170" y1="${y - 4}" x2="550" y2="${y - 4}" stroke="${track}" stroke-width="1"/>`;
        y += 27;
      }
      const label = bar.label.length > 23 ? `${bar.label.slice(0, 22)}…` : bar.label;
      const weekday = bar.weekday
        ? `<text x="0" y="${y}" fill="${muted}" font-size="12">${escapeXml(bar.weekday)}</text>`
        : "";
      const row = `${heading}${weekday}<text x="${bar.weekday ? 34 : 0}" y="${y}" fill="${muted}" font-size="12" font-variant-numeric="tabular-nums">${escapeXml(label)}</text>
      <rect x="170" y="${y - 10}" width="${barWidth}" height="11" rx="3" fill="${track}"/>
      ${barFill(bar, index, y, max, accent, barWidth)}
      <text x="550" y="${y}" text-anchor="end" fill="${text}" font-size="12">${escapeXml(bar.displayValue ?? compact(bar.value))}</text>`;
      y += 31;
      return row;
    })
    .join("");
  const height = y - 5;
  return {
    width: 560,
    height,
    body: `<g font-family="-apple-system,Helvetica,sans-serif"><text x="0" y="17" fill="${text}" font-size="14" font-weight="600">${escapeXml(title)}</text>${legendSvg}${rows}</g>`,
  };
}

export function barChart(title: string, bars: Bar[], legend: ChartLegend = []): string {
  const image = barChartImage(title, bars, legend);
  return imageMarkdown(title, image);
}

function barFill(bar: Bar, index: number, y: number, max: number, accent: string, barWidth: number): string {
  const width = (barWidth * bar.value) / max;
  const segments = bar.segments ?? [{ label: "Activity", value: bar.value, color: accent }];
  let x = 170;
  const fills = segments
    .map((segment) => {
      const segmentWidth = (barWidth * segment.value) / max;
      const fill = `<rect x="${x}" y="${y - 10}" width="${segmentWidth}" height="11" fill="${segment.color}"/>`;
      x += segmentWidth;
      return fill;
    })
    .join("");
  return `<clipPath id="bar-${index}"><rect x="170" y="${y - 10}" width="${width}" height="11" rx="3"/></clipPath><g clip-path="url(#bar-${index})">${fills}</g>`;
}
