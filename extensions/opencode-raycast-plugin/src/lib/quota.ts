import type { Model, ModelCost, Picks } from "./types";

export const ROLLING_BUDGET = 12;
export const TURN_TOKENS = { input: 830, cache: 71_500, output: 295 } as const;

export function effectiveCacheRead(cost: ModelCost): number {
  return cost.cacheRead > 0 ? cost.cacheRead : 0.02 * cost.input;
}

export function costPerTurn(cost: ModelCost): number {
  const cache = effectiveCacheRead(cost);
  return (
    (TURN_TOKENS.input * cost.input +
      TURN_TOKENS.cache * cache +
      TURN_TOKENS.output * cost.output) /
    1_000_000
  );
}

export function quotaFor(cost: ModelCost): number {
  const perTurn = costPerTurn(cost);
  return perTurn <= 0 ? 0 : Math.floor(ROLLING_BUDGET / perTurn);
}

export function picksFor(models: Model[], now: Date): Picks {
  const ranked = models
    .filter((m) => m.quota != null && m.quota > 0)
    .sort(
      (a, b) =>
        (b.quota as number) - (a.quota as number) || a.id.localeCompare(b.id),
    );
  return {
    stretch: ranked[0]?.id ?? null,
    bestValue: ranked[1]?.id ?? null,
    computedAt: now.toISOString(),
  };
}
