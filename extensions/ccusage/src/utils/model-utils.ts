const TIER_ORDER = ["Frontier", "Premium", "Standard", "Fast", "Unknown"] as const;

type ModelTier = (typeof TIER_ORDER)[number];

/**
 * Group models by their tier based on model names (Fable, Opus, Sonnet, Haiku)
 * @template T - Type that extends an object with a model string property
 * @param models - Array of model objects to group
 * @returns Object with tier names as keys and arrays of models as values, ordered from highest to lowest tier
 * @example
 * ```typescript
 * const models = [
 *   { model: "claude-3-opus-20240229", usage: 100 },
 *   { model: "claude-3-sonnet-20240229", usage: 200 }
 * ];
 * const grouped = groupModelsByTier(models);
 * // Result: { "Premium": [...], "Standard": [...] }
 * ```
 */
export const groupModelsByTier = <T extends { model: string }>(models: T[]) => {
  /**
   * Determine the tier of a Claude model based on its name
   * @param model - The model name string
   * @returns The tier classification ("Frontier", "Premium", "Standard", "Fast", or "Unknown")
   */
  const getModelTier = (model: string): ModelTier => {
    const modelName = model.toLowerCase();
    if (modelName.includes("fable") || modelName.includes("mythos")) return "Frontier";
    if (modelName.includes("opus")) return "Premium";
    if (modelName.includes("sonnet")) return "Standard";
    if (modelName.includes("haiku")) return "Fast";
    return "Unknown";
  };

  const grouped = new Map<ModelTier, T[]>(TIER_ORDER.map((tier) => [tier, []]));

  for (const model of models) {
    grouped.get(getModelTier(model.model || ""))?.push(model);
  }

  const result: Record<string, T[]> = {};

  for (const tier of TIER_ORDER) {
    const tierModels = grouped.get(tier);
    if (tierModels && tierModels.length > 0) {
      result[tier] = tierModels;
    }
  }

  return result;
};
