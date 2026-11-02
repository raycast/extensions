import { METRIC_ORDER, type MetricKey } from "./metrics";
import { rankModels, type Model } from "./models";

export interface Standing {
  metric: MetricKey;
  value: number | null;
  /** Competition rank among all evaluated configurations; undefined when the metric is unmeasured. */
  rank?: number;
  /** Number of configurations with a measurement for this metric. */
  total: number;
}

export type StandingsTable = Record<MetricKey, { ranks: Map<string, number>; total: number }>;

export function buildStandings(models: Model[]): StandingsTable {
  return Object.fromEntries(
    METRIC_ORDER.map((metric) => {
      const ranked = rankModels(models, metric);
      return [metric, { ranks: new Map(ranked.map((model) => [model.id, model.rank])), total: ranked.length }];
    }),
  ) as StandingsTable;
}

export function standingsFor(model: Model, table: StandingsTable, metrics = METRIC_ORDER): Standing[] {
  return metrics.map((metric) => {
    const rank = table[metric].ranks.get(model.id);
    return { metric, value: rank === undefined ? null : model[metric], rank, total: table[metric].total };
  });
}
