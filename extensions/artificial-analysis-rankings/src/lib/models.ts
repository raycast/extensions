import { METRIC_ORDER, METRICS, type MetricKey } from "./metrics";

export interface Model {
  id: string;
  name: string;
  slug: string;
  creator: string;
  creatorId: string;
  intelligence: number | null;
  coding: number | null;
  inputPrice: number | null;
  outputPrice: number | null;
  speed: number | null;
  latency: number | null;
}

export interface LeaderboardSnapshot {
  indexVersion: number;
  fetchedAt: number;
  models: Model[];
}

export type RankedModel = Model & {
  rank: number;
  value: number;
  metric: MetricKey;
  rankScope: "families" | "configurations";
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function finiteMetric(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function rankModels(models: Model[], metric: MetricKey = "intelligence"): RankedModel[] {
  const definition = METRICS[metric];
  const direction = definition.direction === "descending" ? -1 : 1;
  const scored = models
    .flatMap((model) => {
      const value = finiteMetric(model[metric]);
      return value === null || (definition.nonnegative && value < 0) ? [] : [{ ...model, value, metric }];
    })
    .toSorted(
      (a, b) => direction * (a.value - b.value) || a.name.localeCompare(b.name, "en") || a.id.localeCompare(b.id, "en"),
    );
  let rank = 0;
  return scored.map((model, index) => {
    if (index === 0 || model.value !== scored[index - 1].value) rank = index + 1;
    return { ...model, rank, rankScope: "configurations" };
  });
}

/** The model ranked by `preferred`, or by the first metric it has a measurement for. */
export function findRanked(models: Model[], id: string, preferred: MetricKey): RankedModel | undefined {
  for (const metric of [preferred, ...METRIC_ORDER]) {
    const entry = rankModels(models, metric).find((model) => model.id === id);
    if (entry) return entry;
  }
  return undefined;
}

/** Every model for pickers: those with an Intelligence Index score by rank, then the rest by name. */
export function pickerOrder(models: Model[]): (Model & { rank?: number })[] {
  const ranked = rankModels(models);
  const rankedIds = new Set(ranked.map((model) => model.id));
  const rest = models
    .filter((model) => !rankedIds.has(model.id))
    .toSorted((a, b) => a.name.localeCompare(b.name, "en") || a.id.localeCompare(b.id, "en"));
  return [...ranked, ...rest];
}

export function filterRankings<T extends Model>(models: T[], query: string): T[] {
  const terms = query.toLocaleLowerCase("en").trim().split(/\s+/).filter(Boolean);
  return models.filter((model) => {
    const text = `${model.name} ${model.creator}`.toLocaleLowerCase("en");
    return terms.every((term) => text.includes(term));
  });
}
