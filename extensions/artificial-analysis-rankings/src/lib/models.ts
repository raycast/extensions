import { METRICS, type MetricKey } from "./metrics";

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

export function filterRankings(models: RankedModel[], query: string): RankedModel[] {
  const terms = query.toLocaleLowerCase("en").trim().split(/\s+/).filter(Boolean);
  return models.filter((model) => {
    const text = `${model.name} ${model.creator}`.toLocaleLowerCase("en");
    return terms.every((term) => text.includes(term));
  });
}
