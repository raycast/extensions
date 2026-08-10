/**
 * Group models by their tier based on model names (Opus, Sonnet, Haiku)
 * @template T - Type that extends an object with a model string property
 * @param models - Array of model objects to group
 * @returns Object with tier names as keys and arrays of models as values
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
   * @returns The tier classification ("Premium", "Standard", "Fast", or "Unknown")
   */
  const getModelTier = (model: string): "Premium" | "Standard" | "Fast" | "Unknown" => {
    const modelName = model.toLowerCase();
    if (modelName.includes("opus")) return "Premium";
    if (modelName.includes("sonnet")) return "Standard";
    if (modelName.includes("haiku")) return "Fast";
    return "Unknown";
  };

  const result: Record<string, T[]> = {};

  for (const model of models) {
    const tier = getModelTier(model.model || "");
    if (!result[tier]) {
      result[tier] = [];
    }
    result[tier].push(model);
  }

  return result;
};
