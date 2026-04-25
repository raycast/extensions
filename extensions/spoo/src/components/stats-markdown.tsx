import { formatClicks } from "@/lib/format";
import { countryDisplay } from "@/lib/emoji-flag";
import { barChart, toMarkdownImage } from "@/lib/svg-chart";
import {
  getBreakdown,
  type BreakdownRow,
  type DimensionName,
  type StatsResponse,
} from "@/schemas/stats";

export interface RenderStatsOptions {
  chartWidth?: number;
}

const SECTIONS: Array<{
  title: string;
  dimension: DimensionName;
  accent: string;
}> = [
  { title: "Top countries", dimension: "country", accent: "#F97316" },
  { title: "Top browsers", dimension: "browser", accent: "#3B82F6" },
  { title: "Top operating systems", dimension: "os", accent: "#D946EF" },
  { title: "Top referrers", dimension: "referrer", accent: "#EAB308" },
];

export function renderStatsSections(
  stats: StatsResponse | undefined,
  options: RenderStatsOptions = {},
): string {
  if (!stats) return "";

  const lines: string[] = [];
  for (const section of SECTIONS) {
    const rows = getBreakdown(stats, "clicks", section.dimension);
    if (rows.length === 0) continue;
    appendBarChart(
      lines,
      section.title,
      rows,
      section.accent,
      section.dimension,
      options.chartWidth,
    );
  }
  return lines.join("\n");
}

function appendBarChart(
  lines: string[],
  title: string,
  rows: BreakdownRow[],
  accent: string,
  dimension: DimensionName,
  chartWidth?: number,
) {
  const entries = rows.slice(0, 5).map((row) => ({
    label: decorate(row.key, dimension),
    value: row.value,
  }));
  const svg = barChart(entries, {
    accent,
    width: chartWidth,
    maxBars: 5,
    valueFormatter: formatClicks,
  });
  lines.push("", `## ${title}`, "", toMarkdownImage(svg, title));
}

function decorate(key: string, dimension?: DimensionName): string {
  if (dimension === "country") {
    const { flag, label } = countryDisplay(key);
    return `${flag} ${label}`;
  }
  return key || "Unknown";
}
