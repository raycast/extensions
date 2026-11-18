import { environment } from "@raycast/api";
import { GEO_CHART_COLORS, GEO_VISITOR_COLORS } from "../constants/geo";
import type { BarChartItem, ChartPoint, ChartSeries } from "../types/charts";
import type { GeoCompetitorTimeseriesPoint, GeoTimeseriesPoint, GeoTrafficPoint } from "../types/geo";
import { escapeMarkdown } from "./geo-format";

const WIDTH = 640;
const HEIGHT = 250;
const BAR_WIDTH = 640;
const PADDING = { top: 38, right: 18, bottom: 34, left: 48 } as const;

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&apos;",
    };
    return entities[character] ?? character;
  });
}

function svgShell(body: string, width = WIDTH, height = HEIGHT): string {
  const isDark = environment.appearance === "dark";
  const primaryText = isDark ? "#e4e4e7" : "#3f3f46";
  const secondaryText = isDark ? "#a1a1aa" : "#71717a";
  const grid = isDark ? "#d4d4d8" : "#71717a";
  const gridOpacity = isDark ? ".16" : ".18";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img">
  <style>
    .axis { fill: ${secondaryText}; font: 11px -apple-system, BlinkMacSystemFont, sans-serif; }
    .legend { fill: ${primaryText}; font: 12px -apple-system, BlinkMacSystemFont, sans-serif; }
    .bar-label { fill: ${primaryText}; font: 14px -apple-system, BlinkMacSystemFont, sans-serif; }
    .bar-value { fill: ${secondaryText}; font: 12px -apple-system, BlinkMacSystemFont, sans-serif; }
    .grid { stroke: ${grid}; stroke-opacity: ${gridOpacity}; }
  </style>
  ${body}
</svg>`;
}

function chartDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function compactNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function linePath(points: ChartPoint[], maxValue: number): string {
  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  return points
    .map((point, index) => {
      const x = PADDING.left + (index / Math.max(points.length - 1, 1)) * plotWidth;
      const y = PADDING.top + plotHeight - (point.value / maxValue) * plotHeight;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function lineChartMarkdown(alt: string, series: ChartSeries[]): string {
  const populatedSeries = series.filter((item) => item.points.length > 0);
  if (populatedSeries.length === 0) {
    return "No data in this time range.";
  }

  const allPoints = populatedSeries.flatMap((item) => item.points);
  const maxValue = Math.max(1, ...allPoints.map((point) => point.value));
  const labels = populatedSeries[0].points;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((ratio) => {
      const y = PADDING.top + plotHeight - ratio * plotHeight;
      return `<line class="grid" x1="${PADDING.left}" x2="${WIDTH - PADDING.right}" y1="${y}" y2="${y}"/><text class="axis" x="${PADDING.left - 8}" y="${y + 4}" text-anchor="end">${compactNumber(maxValue * ratio)}</text>`;
    })
    .join("");
  const labelIndexes = [0, Math.floor((labels.length - 1) / 2), labels.length - 1].filter(
    (index, position, indexes) => index >= 0 && indexes.indexOf(index) === position,
  );
  const xLabels = labelIndexes
    .map((index) => {
      const x = PADDING.left + (index / Math.max(labels.length - 1, 1)) * plotWidth;
      const anchor = index === 0 ? "start" : index === labels.length - 1 ? "end" : "middle";
      return `<text class="axis" x="${x}" y="${HEIGHT - 10}" text-anchor="${anchor}">${escapeXml(labels[index].label)}</text>`;
    })
    .join("");
  let legendX = PADDING.left;
  const legend = populatedSeries
    .map((item) => {
      const x = legendX;
      legendX += Math.max(88, item.label.length * 7 + 28);
      return `<circle cx="${x + 5}" cy="16" r="4" fill="${item.color}"/><text class="legend" x="${x + 15}" y="20">${escapeXml(item.label)}</text>`;
    })
    .join("");
  const lines = populatedSeries
    .map((item, index) => {
      const path = linePath(item.points, maxValue);
      const fill =
        index === 0 && populatedSeries.length === 1
          ? `<path d="${path} L${WIDTH - PADDING.right},${HEIGHT - PADDING.bottom} L${PADDING.left},${HEIGHT - PADDING.bottom} Z" fill="${item.color}" opacity=".12"/>`
          : "";
      return `${fill}<path d="${path}" fill="none" stroke="${item.color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"/>`;
    })
    .join("");

  const svg = svgShell(`${legend}${grid}${xLabels}${lines}`);
  return `![${escapeMarkdown(alt)}](${chartDataUri(svg)}?raycast-width=${WIDTH}&raycast-height=${HEIGHT})`;
}

export function barChartMarkdown(alt: string, items: BarChartItem[], valueSuffix = ""): string {
  const visible = items.slice(0, 8);
  if (visible.length === 0) {
    return "No data in this time range.";
  }

  const maxValue = Math.max(1, ...visible.map((item) => item.value));
  const rowHeight = 30;
  const top = 8;
  const labelWidth = 190;
  const chartWidth = BAR_WIDTH - labelWidth - 62;
  const rows = visible
    .map((item, index) => {
      const y = top + index * rowHeight;
      const width = (item.value / maxValue) * chartWidth;
      const label = item.label.length > 22 ? `${item.label.slice(0, 21)}...` : item.label;
      return `<text class="bar-label" x="${labelWidth - 12}" y="${y + 18}" text-anchor="end">${escapeXml(label)}</text><rect x="${labelWidth}" y="${y + 3}" width="${Math.max(width, 2)}" height="20" rx="6" fill="${item.color}"/><text class="bar-value" x="${labelWidth + width + 8}" y="${y + 18}">${compactNumber(item.value)}${escapeXml(valueSuffix)}</text>`;
    })
    .join("");
  const chartHeight = Math.max(90, top + visible.length * rowHeight + 6);
  const svg = svgShell(rows, BAR_WIDTH, chartHeight);
  return `![${escapeMarkdown(alt)}](${chartDataUri(svg)}?raycast-width=${BAR_WIDTH}&raycast-height=${chartHeight})`;
}

export function aggregateVisibility(points: GeoTimeseriesPoint[], engine?: string): ChartPoint[] {
  const totals = new Map<string, number>();
  for (const point of points) {
    if (!engine || point.engine === engine) {
      totals.set(point.day, (totals.get(point.day) ?? 0) + point.mentions);
    }
  }
  return [...totals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, value]) => ({ label, value }));
}

export function competitorSeries(points: GeoCompetitorTimeseriesPoint[], brand: string): ChartPoint[] {
  return points
    .filter((point) => point.brand === brand)
    .sort((left, right) => left.day.localeCompare(right.day))
    .map((point) => ({ label: point.day, value: point.mentions }));
}

export function trafficSeries(points: GeoTrafficPoint[], visitorType: "crawler" | "ai_referral"): ChartSeries {
  const totals = new Map<string, number>();
  for (const point of points) {
    if (point.visitorType === visitorType) {
      totals.set(point.day, (totals.get(point.day) ?? 0) + point.visits);
    }
  }
  return {
    color: GEO_VISITOR_COLORS[visitorType],
    label: visitorType === "crawler" ? "Crawlers" : "AI referrals",
    points: [...new Set(points.map((point) => point.day))]
      .sort((left, right) => left.localeCompare(right))
      .map((label) => ({ label, value: totals.get(label) ?? 0 })),
  };
}

export function chartColor(index: number): string {
  return GEO_CHART_COLORS[index % GEO_CHART_COLORS.length];
}
