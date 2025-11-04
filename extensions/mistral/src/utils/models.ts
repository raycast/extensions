export const VALID_MODEL_IDS = [
  "mistral-small-latest",
  "mistral-medium-latest",
  "mistral-large-latest",
  "codestral-latest",
] as const;

export type ModelId = (typeof VALID_MODEL_IDS)[number];

export const FALLBACK_MODELS = [
  { id: "mistral-small-latest" as const, name: "Mistral Small" },
  { id: "mistral-medium-latest" as const, name: "Mistral Medium" },
  { id: "mistral-large-latest" as const, name: "Mistral Large" },
  { id: "codestral-latest" as const, name: "Codestral" },
] as const;

export const DEFAULT_MODEL_ID: ModelId = "mistral-small-latest";

export function validateModelId(modelId: string | undefined, fallback: string = DEFAULT_MODEL_ID): string {
  if (!modelId) return fallback;
  return VALID_MODEL_IDS.includes(modelId as (typeof VALID_MODEL_IDS)[number]) ? modelId : fallback;
}

export function isValidModelId(modelId: string): boolean {
  return VALID_MODEL_IDS.includes(modelId as (typeof VALID_MODEL_IDS)[number]);
}
