import type { UsageSummary, UsageTotals } from "../usageSummary/usageSummary";

export type SummaryMetric = {
  id: "today" | "monthToDate" | "total";
  title: string;
  subtitle: string;
  totals: UsageTotals;
};

export const createSummaryMetrics = (
  summary: UsageSummary,
): SummaryMetric[] => [
  {
    id: "today",
    title: "Today",
    subtitle: "Current local day",
    totals: summary.today,
  },
  {
    id: "monthToDate",
    title: "This Month",
    subtitle: "Current calendar month",
    totals: summary.monthToDate,
  },
  {
    id: "total",
    title: "Total Returned",
    subtitle: "All rows returned by ccusage",
    totals: summary.total,
  },
];

export const buildRawJson = (
  dailyStdout: string,
  blocksStdout: string,
): string =>
  JSON.stringify(
    {
      daily: JSON.parse(dailyStdout),
      blocks: JSON.parse(blocksStdout),
    },
    null,
    2,
  );
