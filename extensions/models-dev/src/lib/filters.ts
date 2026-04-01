import { Model, Capability } from "./types";

/**
 * Filter models by capability
 */
export function filterByCapability(models: Model[], capability: Capability): Model[] {
  switch (capability) {
    case "vision":
      return models.filter((m) => m.modalities.input.includes("image"));
    case "audio":
      return models.filter((m) => m.modalities.input.includes("audio") || m.modalities.output.includes("audio"));
    case "video":
      return models.filter((m) => m.modalities.input.includes("video"));
    case "pdf":
      return models.filter((m) => m.modalities.input.includes("pdf"));
    case "reasoning":
      return models.filter((m) => m.reasoning);
    case "tool_call":
      return models.filter((m) => m.tool_call);
    case "structured_output":
      return models.filter((m) => m.structured_output);
    case "open_weights":
      return models.filter((m) => m.open_weights);
    default:
      return models;
  }
}

/**
 * Filter models by multiple capabilities (AND logic)
 */
export function filterByCapabilities(models: Model[], capabilities: Capability[]): Model[] {
  if (capabilities.length === 0) return models;
  return capabilities.reduce((filtered, cap) => filterByCapability(filtered, cap), models);
}

/**
 * Filter models by provider
 */
export function filterByProvider(models: Model[], providerId: string): Model[] {
  return models.filter((m) => m.providerId === providerId);
}

/**
 * Filter models by maximum input price
 */
export function filterByMaxPrice(models: Model[], maxInputPrice: number): Model[] {
  return models.filter((m) => m.cost && m.cost.input <= maxInputPrice);
}

/**
 * Filter models by minimum context window
 */
export function filterByMinContext(models: Model[], minContext: number): Model[] {
  return models.filter((m) => m.limit && m.limit.context >= minContext);
}

/**
 * Filter out deprecated models
 */
export function filterOutDeprecated(models: Model[]): Model[] {
  return models.filter((m) => m.status !== "deprecated");
}

/**
 * Sort models by input price (ascending by default)
 */
export function sortByPrice(models: Model[], ascending = true): Model[] {
  return [...models].sort((a, b) => {
    const priceA = a.cost?.input ?? Infinity;
    const priceB = b.cost?.input ?? Infinity;
    return ascending ? priceA - priceB : priceB - priceA;
  });
}

/**
 * Sort models by context window (descending by default)
 */
export function sortByContextWindow(models: Model[], ascending = false): Model[] {
  return [...models].sort((a, b) => {
    const ctxA = a.limit?.context ?? 0;
    const ctxB = b.limit?.context ?? 0;
    return ascending ? ctxA - ctxB : ctxB - ctxA;
  });
}

/**
 * Sort models by name
 */
export function sortByName(models: Model[], ascending = true): Model[] {
  return [...models].sort((a, b) => {
    const compare = a.name.localeCompare(b.name);
    return ascending ? compare : -compare;
  });
}

/**
 * Sort models by provider, then name
 */
export function sortByProviderThenName(models: Model[]): Model[] {
  return [...models].sort((a, b) => {
    const providerCompare = a.providerName.localeCompare(b.providerName);
    if (providerCompare !== 0) return providerCompare;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Get unique providers from a list of models
 */
export function getUniqueProviders(models: Model[]): { id: string; name: string }[] {
  const seen = new Set<string>();
  const providers: { id: string; name: string }[] = [];

  for (const model of models) {
    if (!seen.has(model.providerId)) {
      seen.add(model.providerId);
      providers.push({ id: model.providerId, name: model.providerName });
    }
  }

  return providers.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Check if a model has any of the specified capabilities
 */
export function hasAnyCapability(model: Model, capabilities: Capability[]): boolean {
  return capabilities.some((cap) => {
    switch (cap) {
      case "vision":
        return model.modalities.input.includes("image");
      case "audio":
        return model.modalities.input.includes("audio") || model.modalities.output.includes("audio");
      case "video":
        return model.modalities.input.includes("video");
      case "pdf":
        return model.modalities.input.includes("pdf");
      case "reasoning":
        return model.reasoning;
      case "tool_call":
        return model.tool_call;
      case "structured_output":
        return model.structured_output;
      case "open_weights":
        return model.open_weights;
      default:
        return false;
    }
  });
}

/**
 * Count models with a specific capability
 */
export function countByCapability(models: Model[], capability: Capability): number {
  return filterByCapability(models, capability).length;
}
