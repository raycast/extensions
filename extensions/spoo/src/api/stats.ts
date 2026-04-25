import { apiDownload, apiFetch } from "@/api/client";
import {
  StatsResponseSchema,
  type ExportFormat,
  type StatsResponse,
} from "@/schemas/stats";

export type StatsScope = "anon" | "all";

export interface StatsOptions {
  scope?: StatsScope;
  shortCode?: string;
  groupBy?: Array<"time" | "browser" | "os" | "country" | "city" | "referrer">;
  metrics?: Array<"clicks" | "unique_clicks">;
  startDate?: string;
  endDate?: string;
  timezone?: string;
}

export async function getStats(
  options: StatsOptions = {},
): Promise<StatsResponse> {
  return apiFetch("/api/v1/stats", {
    query: {
      scope: options.scope ?? "all",
      short_code: options.shortCode,
      group_by: options.groupBy?.join(","),
      metrics: options.metrics?.join(","),
      start_date: options.startDate,
      end_date: options.endDate,
      timezone: options.timezone,
    },
    schema: StatsResponseSchema,
  });
}

export async function exportStats(options: {
  scope: StatsScope;
  format: ExportFormat;
  shortCode?: string;
}): Promise<Blob> {
  const query: Record<string, string> = {
    scope: options.scope,
    format: options.format,
  };
  if (options.shortCode) query.short_code = options.shortCode;
  return apiDownload("/api/v1/export", query);
}
