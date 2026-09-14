import { request } from "./postproxy";
import type { PostStatsResponse } from "./types";

/** The API caps `/posts/stats?post_ids=` at 50 ids per request. */
const STATS_BATCH = 50;

/** Pick the impressions-like metric out of a stats snapshot (key varies by platform). */
export function impressionsOf(stats: Record<string, number>): number {
  const key = Object.keys(stats).find((k) => /impression/i.test(k));
  return key ? Number(stats[key]) || 0 : 0;
}

/**
 * Latest snapshot stats per platform for a post, summed across every profile on that platform. A post
 * can be published to multiple profiles of the same network — each is its own entry in the response —
 * so we add up their latest metrics instead of letting one profile overwrite another (which under-counted
 * totals, e.g. two Instagram profiles at 100 and 200 showing 200 instead of 300).
 */
export function latestStatsByPlatform(
  response: PostStatsResponse | undefined,
  postId: string,
): Map<string, Record<string, number>> {
  const map = new Map<string, Record<string, number>>();
  for (const entry of response?.data?.[postId]?.platforms ?? []) {
    const last = entry.records.at(-1);
    if (!last) continue;
    const net = entry.platform.toLowerCase();
    const totals = map.get(net) ?? {};
    for (const [key, value] of Object.entries(last.stats)) totals[key] = (totals[key] ?? 0) + (Number(value) || 0);
    map.set(net, totals);
  }
  return map;
}

/** Sum of the latest impressions across every profile the post was published to. */
export function totalImpressions(response: PostStatsResponse | undefined, postId: string): number {
  let sum = 0;
  for (const stats of latestStatsByPlatform(response, postId).values()) sum += impressionsOf(stats);
  return sum;
}

/**
 * Fetch stats for many posts, batched to the API's 50-id limit and merged into one response. Keeps
 * partial results if a batch fails — impressions are a decorative accessory, not primary data.
 */
export async function loadPostStats(postIds: string[]): Promise<PostStatsResponse> {
  const chunks: string[][] = [];
  for (let i = 0; i < postIds.length; i += STATS_BATCH) chunks.push(postIds.slice(i, i + STATS_BATCH));
  const settled = await Promise.allSettled(
    chunks.map((chunk) => request<PostStatsResponse>("GET", `/posts/stats?post_ids=${chunk.join(",")}`)),
  );
  const data: PostStatsResponse["data"] = {};
  for (const result of settled) {
    if (result.status === "fulfilled") Object.assign(data, result.value?.data ?? {});
  }
  return { data };
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
