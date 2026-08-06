import type { ModelInfo } from "./api";

export const MODEL_REJECTION_TTL_MS = 60 * 60 * 1000;
export type ModelRejections = Record<string, number>;

export function filterAvailableModels<T extends Pick<ModelInfo, "id">>(
  models: T[],
  rejections: ModelRejections,
  now = Date.now(),
): T[] {
  return models.filter((model) => {
    const rejectedAt = rejections[model.id];
    return !rejectedAt || now - rejectedAt > MODEL_REJECTION_TTL_MS;
  });
}
