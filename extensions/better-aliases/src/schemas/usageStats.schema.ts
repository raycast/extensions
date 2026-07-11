import { z } from "zod";

export const dailyStatsSchema = z.record(z.string(), z.number().int().nonnegative());

export const usageStatsSchema = z.record(z.string(), dailyStatsSchema);

export type DailyStats = z.infer<typeof dailyStatsSchema>;
export type UsageStats = z.infer<typeof usageStatsSchema>;
