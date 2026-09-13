import type { PostStatsResponse } from "./types";

/** Pick the impressions-like metric out of a stats snapshot (key varies by platform). */
export function impressionsOf(stats: Record<string, number>): number {
  const key = Object.keys(stats).find((k) => /impression/i.test(k));
  return key ? Number(stats[key]) || 0 : 0;
}

/** Latest snapshot stats per platform for a post, from a /posts/stats response. */
export function latestStatsByPlatform(
  response: PostStatsResponse | undefined,
  postId: string,
): Map<string, Record<string, number>> {
  const map = new Map<string, Record<string, number>>();
  for (const platform of response?.data?.[postId]?.platforms ?? []) {
    const last = platform.records.at(-1);
    if (last) map.set(platform.platform.toLowerCase(), last.stats);
  }
  return map;
}

/** Sum of the latest impressions across all platforms for a post. */
export function totalImpressions(response: PostStatsResponse | undefined, postId: string): number {
  let sum = 0;
  for (const stats of latestStatsByPlatform(response, postId).values()) sum += impressionsOf(stats);
  return sum;
}

export const ANALYTICS_PERIODS = [
  { title: "All time", value: "all" },
  { title: "Last 7 days", value: "7" },
  { title: "Last 30 days", value: "30" },
  { title: "Last 90 days", value: "90" },
] as const;

export function periodLabel(value: string): string {
  return ANALYTICS_PERIODS.find((p) => p.value === value)?.title ?? "All time";
}

/** ISO `from` timestamp for a period value, or undefined for "all". */
export function periodFromIso(value: string): string | undefined {
  if (value === "all") return undefined;
  return new Date(Date.now() - Number(value) * 86_400_000).toISOString();
}
