import { Model, Capability } from "./types";

export function hasCapability(model: Model, capability: Capability): boolean {
  switch (capability) {
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
    case "attachment":
      return model.attachment;
    case "temperature":
      return model.temperature;
    default: {
      const _exhaustive: never = capability;
      return _exhaustive;
    }
  }
}

/**
 * Filter models by capability
 */
export function filterByCapability(models: Model[], capability: Capability): Model[] {
  return models.filter((model) => hasCapability(model, capability));
}

/**
 * Filter models by multiple capabilities (AND logic)
 */
export function filterByCapabilities(models: Model[], capabilities: Capability[]): Model[] {
  if (capabilities.length === 0) return models;
  return capabilities.reduce((filtered, cap) => filterByCapability(filtered, cap), models);
}

/**
 * Filter out deprecated models
 */
export function filterOutDeprecated(models: Model[]): Model[] {
  return models.filter((m) => m.status !== "deprecated");
}
