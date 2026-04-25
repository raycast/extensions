import { z } from "zod";

export const StatsSummarySchema = z.object({
  total_clicks: z.number().default(0),
  unique_clicks: z.number().default(0),
  first_click: z.string().nullable().optional(),
  last_click: z.string().nullable().optional(),
  avg_redirection_time: z.number().default(0),
});
export type StatsSummary = z.infer<typeof StatsSummarySchema>;

export const StatsTimeRangeSchema = z.object({
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
});
export type StatsTimeRange = z.infer<typeof StatsTimeRangeSchema>;

export const StatsMetricPointSchema = z.record(
  z.union([z.string(), z.number()]),
);
export type StatsMetricPoint = z.infer<typeof StatsMetricPointSchema>;

export const StatsResponseSchema = z.object({
  scope: z.string().optional(),
  filters: z.record(z.unknown()).default({}),
  group_by: z.array(z.string()).default([]),
  timezone: z.string().optional(),
  time_range: StatsTimeRangeSchema.nullable().optional(),
  summary: StatsSummarySchema.nullable().optional(),
  metrics: z.record(z.array(StatsMetricPointSchema)).default({}),
  generated_at: z.string().nullable().optional(),
  api_version: z.string().nullable().optional(),
  short_code: z.string().nullable().optional(),
});
export type StatsResponse = z.infer<typeof StatsResponseSchema>;

export const EMPTY_SUMMARY: StatsSummary = {
  total_clicks: 0,
  unique_clicks: 0,
  avg_redirection_time: 0,
  first_click: null,
  last_click: null,
};

export function summaryOf(
  stats: StatsResponse | undefined | null,
): StatsSummary {
  return stats?.summary ?? EMPTY_SUMMARY;
}

export const ExportFormat = z.enum(["json", "csv", "xlsx", "xml"]);
export type ExportFormat = z.infer<typeof ExportFormat>;

export type MetricName = "clicks" | "unique_clicks";
export type DimensionName =
  | "time"
  | "browser"
  | "os"
  | "country"
  | "city"
  | "referrer"
  | "short_code";

export interface BreakdownRow {
  key: string;
  value: number;
  percentage: number;
}

export function getBreakdown(
  stats: StatsResponse | undefined,
  metric: MetricName,
  dimension: DimensionName,
): BreakdownRow[] {
  if (!stats) return [];
  const rows = stats.metrics[`${metric}_by_${dimension}`] ?? [];
  return rows
    .map((row) => ({
      key: String(row[dimension] ?? ""),
      value: Number(row[metric] ?? 0),
      percentage: Number(row[`${metric}_percentage`] ?? 0),
    }))
    .filter((row) => row.key !== "" || row.value > 0);
}

export function getTimeSeries(
  stats: StatsResponse | undefined,
  metric: MetricName = "clicks",
): Array<{ time: string; value: number }> {
  if (!stats) return [];
  const rows = stats.metrics[`${metric}_by_time`] ?? [];
  return rows
    .map((row) => ({
      time: String(row.time ?? ""),
      value: Number(row[metric] ?? 0),
    }))
    .filter((row) => row.time !== "");
}
