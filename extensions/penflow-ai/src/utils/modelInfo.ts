import { Icon } from "@raycast/api";
import type { SupportedModel } from "./types";

interface ModelDetails {
  name: string;
  provider: string;
  icon: Icon;
}

export const modelInfo: Record<SupportedModel, ModelDetails> = {
  "openai-gpt-4o": {
    name: "GPT-4",
    provider: "OpenAI",
    icon: Icon.Stars,
  },
  "openai-gpt-4o-mini": {
    name: "GPT-4 Mini",
    provider: "OpenAI",
    icon: Icon.Star,
  },
  "anthropic-claude-sonnet": {
    name: "Claude 3 Sonnet",
    provider: "Anthropic",
    icon: Icon.LightBulb,
  },
};

export type { SupportedModel };

export function getModelDetails(modelId: SupportedModel): ModelDetails {
  const details = modelInfo[modelId];
  if (!details) {
    throw new Error(`Unknown model: ${modelId}`);
  }
  return details;
}

export function getSupportedModels(): SupportedModel[] {
  return Object.keys(modelInfo) as SupportedModel[];
}

export function isValidModel(modelId: string): modelId is SupportedModel {
  return modelId in modelInfo;
}
