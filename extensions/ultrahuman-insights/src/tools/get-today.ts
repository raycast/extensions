import { getRange } from "../lib/cache";
import { today, lastNDaysEpoch, latestWithField } from "../lib/format";
import { DailyMetrics, METRIC_LABELS, MetricName } from "../lib/types";

const SLEEP_METRICS = new Set<MetricName>([
  "sleep_score",
  "total_sleep",
  "rem_sleep",
  "deep_sleep",
  "light_sleep",
  "sleep_efficiency",
]);

function snapshotFromRange(range: DailyMetrics[], dateStr: string): DailyMetrics {
  const sorted = [...range].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  const todayEntry = sorted[sorted.length - 1];
  const metrics: DailyMetrics = { date: dateStr };
  for (const metric of Object.keys(METRIC_LABELS) as MetricName[]) {
    const entry = SLEEP_METRICS.has(metric) ? latestWithField(sorted, metric) : todayEntry;
    const value = entry?.[metric];
    if (value != null) metrics[metric] = value;
  }
  return metrics;
}

/**
 * Returns a snapshot of all of today's available Ultrahuman metrics.
 * Use when the user asks "how am I today", "how did I sleep", "what's my recovery",
 * or any unscoped question about current health state.
 */
export default async function tool() {
  const dateStr = today();
  const { start, end } = lastNDaysEpoch(7);
  const { data, stale } = await getRange(start, end);
  const metrics = snapshotFromRange(data, dateStr);
  const available = Object.entries(metrics).some(([k, v]) => k !== "date" && v != null);
  return {
    date: dateStr,
    as_of: new Date().toISOString(),
    stale,
    available,
    metrics,
  };
}
