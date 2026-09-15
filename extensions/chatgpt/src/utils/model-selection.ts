import type { Model } from "../type";
import { DEFAULT_MODEL } from "./model-defaults";

export function initialModelId(explicit: Model | undefined, cachedId: string | undefined): string {
  return explicit?.id ?? cachedId ?? DEFAULT_MODEL.id;
}

export function selectedChatModel(models: Record<string, Model>, selectedId: string, fallback?: Model): Model {
  return models[selectedId] ?? (fallback?.id === selectedId ? fallback : undefined) ?? models.default ?? DEFAULT_MODEL;
}
