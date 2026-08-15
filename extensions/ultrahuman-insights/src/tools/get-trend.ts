import { getRange } from "../lib/cache";
import { assertAiAccess } from "../lib/ai-access";
import { lastNDaysEpoch, formatMetricValue, today } from "../lib/format";
import { METRIC_LABELS, MetricName } from "../lib/types";

const VALID_METRICS = Object.keys(METRIC_LABELS) as MetricName[];

type Input = {
  /** Which metric. One of: sleep_score, total_sleep, rem_sleep, deep_sleep,
   * light_sleep, sleep_efficiency, hrv, night_rhr, hr, recovery_index,
   * movement_index, temp, spo2, vo2_max, steps, active_minutes. */
  metric:
    | "sleep_score"
    | "total_sleep"
    | "rem_sleep"
    | "deep_sleep"
    | "light_sleep"
    | "sleep_efficiency"
    | "hrv"
    | "night_rhr"
    | "hr"
    | "recovery_index"
    | "movement_index"
    | "temp"
    | "spo2"
    | "vo2_max"
    | "steps"
    | "active_minutes";
  /** Number of days of history (1–7). Defaults to 7. */
  days?: number;
};

/**
 * Returns N days of history for a single metric.
 * Use when the user asks about trends: "is my HRV trending up", "how has my sleep
 * been this week", "show me my recovery over the past 5 days".
 */
export default async function tool(input: Input) {
  assertAiAccess();
  if (!VALID_METRICS.includes(input.metric)) {
    throw new Error(`Unknown metric: "${input.metric}". Valid metrics: ${VALID_METRICS.join(", ")}`);
  }
  const days = Math.min(7, Math.max(1, input.days ?? 7));
  const { start, end } = lastNDaysEpoch(days);
  const { data, stale } = await getRange(start, end);

  const series = [...data]
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
    .map((d) => {
      const value = d[input.metric] ?? null;
      return {
        date: d.date,
        value,
        formatted_value: value != null ? formatMetricValue(input.metric, value) : "—",
      };
    });

  return {
    date: today(),
    as_of: new Date().toISOString(),
    stale,
    metric: input.metric,
    label: METRIC_LABELS[input.metric] ?? input.metric,
    days,
    series,
  };
}
