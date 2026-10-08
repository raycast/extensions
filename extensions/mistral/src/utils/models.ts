export const VALID_MODEL_IDS = [
  "mistral-small-latest",
  "mistral-medium-latest",
  "mistral-large-latest",
  "codestral-latest",
  "pixtral-12b-latest",
  "pixtral-large-latest",
] as const;

export type ModelId = (typeof VALID_MODEL_IDS)[number];

export const FALLBACK_MODELS = [
  { id: "mistral-small-latest" as const, name: "Mistral Small", vision: false },
  { id: "mistral-medium-latest" as const, name: "Mistral Medium", vision: false },
  { id: "mistral-large-latest" as const, name: "Mistral Large", vision: false },
  { id: "codestral-latest" as const, name: "Codestral", vision: false },
  { id: "pixtral-12b-latest" as const, name: "Pixtral 12B", vision: true },
  { id: "pixtral-large-latest" as const, name: "Pixtral Large", vision: true },
] as const;

export const DEFAULT_MODEL_ID: ModelId = "mistral-small-latest";

export function validateModelId(modelId: string | undefined, fallback: string = DEFAULT_MODEL_ID): string {
  if (!modelId) return fallback;
  return VALID_MODEL_IDS.includes(modelId as (typeof VALID_MODEL_IDS)[number]) ? modelId : fallback;
}

export function isValidModelId(modelId: string): boolean {
  return VALID_MODEL_IDS.includes(modelId as (typeof VALID_MODEL_IDS)[number]);
}

export function supportsVision(modelId: string): boolean {
  const model = FALLBACK_MODELS.find((m) => m.id === modelId);
  return model?.vision ?? false;
}

export function getDefaultVisionModel(): ModelId {
  return "pixtral-large-latest";
}
