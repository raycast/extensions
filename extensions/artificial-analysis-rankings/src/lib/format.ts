import { LEADERBOARD_URL } from "./api";
import { formatPrice, isPriceMetric, METRIC_ORDER, METRICS, type MetricKey } from "./metrics";
import type { LeaderboardSnapshot, RankedModel } from "./models";
import type { Standing } from "./standings";

export { formatPrice, formatScore } from "./metrics";

export interface MetricPreferences {
  showCoding: boolean;
  showPrice: boolean;
  showSpeed: boolean;
}

const MISSING = "—";

export function modelUrl(slug: string): string {
  return `https://artificialanalysis.ai/models/${encodeURIComponent(slug)}`;
}

/**
 * Metrics shown in model details, in display order: the active ranking metric, Intelligence Index and latency,
 * plus the optional statistics enabled in preferences. Both prices appear together.
 */
export function detailMetrics(preferences: MetricPreferences, active: MetricKey): MetricKey[] {
  return METRIC_ORDER.filter((metric) => {
    if (metric === active || metric === "intelligence" || metric === "latency") return true;
    if (metric === "coding") return preferences.showCoding;
    if (metric === "speed") return preferences.showSpeed;
    return preferences.showPrice || isPriceMetric(active);
  });
}

export function formatRank(rank: number | undefined, total: number): string {
  return rank === undefined ? "Not ranked" : `#${rank} of ${total}`;
}

/** A metric value with its rank, e.g. "74.6 · #1 of 312", or an em dash when unmeasured. */
export function formatStanding(standing: Standing): string {
  return standing.rank === undefined
    ? MISSING
    : `${METRICS[standing.metric].format(standing.value)} · ${formatRank(standing.rank, standing.total)}`;
}

export function formatAge(fetchedAt: number, now: number): string {
  const minutes = Math.max(0, Math.floor((now - fetchedAt) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

export function formatRetrievedAt(fetchedAt: number): string {
  return new Date(fetchedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function modelSummary(
  model: RankedModel,
  snapshot: LeaderboardSnapshot,
  preferences: MetricPreferences,
): string {
  const lines = [
    `#${model.rank} ${model.name} — ${model.creator}`,
    `Ranked by: ${METRICS[model.metric].title} (${model.rankScope === "families" ? "distinct models" : "evaluated configurations"})`,
    `Intelligence Index v${snapshot.indexVersion}: ${model.intelligence ?? MISSING}`,
  ];
  if (preferences.showCoding || model.metric === "coding") lines.push(`Coding Index: ${model.coding ?? MISSING}`);
  if (preferences.showPrice || model.metric === "inputPrice" || model.metric === "outputPrice") {
    lines.push(
      `Price (USD per 1M tokens): ${formatPrice(model.inputPrice)} input / ${formatPrice(model.outputPrice)} output`,
    );
  }
  if (preferences.showSpeed || model.metric === "speed")
    lines.push(`Median output speed: ${model.speed === null ? MISSING : `${model.speed} tokens/s`}`);
  if (model.metric === "latency") lines.push(`Time to first token: ${METRICS.latency.format(model.latency)}`);
  lines.push(
    `Source: Artificial Analysis (${modelUrl(model.slug)})`,
    `Leaderboard: ${LEADERBOARD_URL}`,
    `Retrieved: ${new Date(snapshot.fetchedAt).toISOString()}`,
  );
  return lines.join("\n");
}
