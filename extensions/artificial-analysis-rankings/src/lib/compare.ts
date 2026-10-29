import { finiteMetric, type Model } from "./models";
import { METRICS, type MetricKey } from "./metrics";

export type Verdict = "best" | "worst" | "neutral" | "missing";

export interface ComparedValue {
  model: Model;
  value: number | null;
  verdict: Verdict;
}

/**
 * Marks which compared models are best and worst on a metric, respecting whether higher or lower is better.
 * Nothing is marked when fewer than two models have a measurement or when every measurement is equal.
 */
export function compareMetric(models: Model[], metric: MetricKey): ComparedValue[] {
  const definition = METRICS[metric];
  const values = models.map((model) => {
    const value = finiteMetric(model[metric]);
    return value === null || (definition.nonnegative && value < 0) ? null : value;
  });
  const measured = values.filter((value): value is number => value !== null);
  const high = Math.max(...measured);
  const low = Math.min(...measured);
  const comparable = measured.length >= 2 && high !== low;
  const best = definition.direction === "descending" ? high : low;
  const worst = definition.direction === "descending" ? low : high;
  return models.map((model, index) => {
    const value = values[index];
    let verdict: Verdict = "neutral";
    if (value === null) verdict = "missing";
    else if (comparable && value === best) verdict = "best";
    else if (comparable && value === worst) verdict = "worst";
    return { model, value, verdict };
  });
}
