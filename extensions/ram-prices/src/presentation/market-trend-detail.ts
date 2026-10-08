import type { MarketTrendSeries } from "../types/market-trends";
import { formatPercent, formatShortDate, formatUsdPerGb } from "../utils/format";

export function getMarketTrendMarkdown(series: MarketTrendSeries) {
  const rows = series.history
    .slice(-10)
    .reverse()
    .map(
      (point) => `| ${formatShortDate(point.date)} | ${formatUsdPerGb(point.avgPricePerGb)} | ${point.productCount} |`,
    )
    .join("\n");

  return [
    `# ${series.generation}`,
    "",
    `- **Latest Price: ${formatUsdPerGb(series.latest.avgPricePerGb)}**`,
    `- Change vs previous: ${formatPercent(series.changePercent)}`,
    `- Products tracked: ${series.latest.productCount}`,
    `- Latest Date: ${formatShortDate(series.latest.date)}`,
    "",
    "## Recent History",
    "",
    "| Date | Avg Price | Products |",
    "| --- | --- | --- |",
    rows || "| No history available | - | - |",
  ].join("\n");
}
