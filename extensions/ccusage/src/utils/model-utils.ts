export const groupModelsByTier = <T extends { model: string }>(models: T[]) => {
  const getModelTier = (model: string): "Premium" | "Standard" | "Fast" | "Unknown" => {
    const modelName = model.toLowerCase();
    if (modelName.includes("opus")) return "Premium";
    if (modelName.includes("sonnet")) return "Standard";
    if (modelName.includes("haiku")) return "Fast";
    return "Unknown";
  };

  return models.reduce(
    (acc, model) => {
      const tier = getModelTier(model.model || "");
      if (!acc[tier]) acc[tier] = [];
      acc[tier].push(model);
      return acc;
    },
    {} as Record<string, T[]>,
  );
};
