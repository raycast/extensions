import { getDay } from "../lib/cache";
import { assertAiAccess } from "../lib/ai-access";
import { today, formatMetricValue } from "../lib/format";
import { METRIC_LABELS, MetricName } from "../lib/types";

const VALID_METRICS = Object.keys(METRIC_LABELS) as MetricName[];

type Input = {
  /**
   * Which metric to return. One of: sleep_score, total_sleep, rem_sleep, deep_sleep,
   * light_sleep, sleep_efficiency, hrv, night_rhr, hr, recovery_index, movement_index,
   * temp, spo2, vo2_max, steps, active_minutes.
   */
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
  /**
   * Optional date in YYYY-MM-DD. Defaults to today.
   */
  date?: string;
};

/**
 * Returns a single named metric for a specific date.
 * Use when the user asks about one specific metric like "what was my HRV on Monday".
 */
export default async function tool(input: Input) {
  assertAiAccess();
  if (!VALID_METRICS.includes(input.metric)) {
    throw new Error(`Unknown metric: "${input.metric}". Valid metrics: ${VALID_METRICS.join(", ")}`);
  }
  const date = input.date ?? today();
  const { data, stale } = await getDay(date);
  const value = data[input.metric];
  const numericValue = value ?? null;
  return {
    date,
    as_of: new Date().toISOString(),
    stale,
    metric: input.metric,
    label: METRIC_LABELS[input.metric] ?? input.metric,
    value: numericValue,
    formatted_value: numericValue != null ? formatMetricValue(input.metric, numericValue) : "—",
    available: value != null,
  };
}
