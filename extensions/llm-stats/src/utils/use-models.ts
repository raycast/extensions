import { useCachedPromise } from "@raycast/utils";
import { ZeroEvalAPI } from "./zeroeval-api";
import { ModelListItem } from "../types";

const api = new ZeroEvalAPI();

/**
 * Hook to fetch and cache the list of all models
 * @param justCanonicals - Return only canonical models (default: true)
 * @param includeBenchmarks - Include benchmark data (default: true)
 */
export function useModels(justCanonicals: boolean = true, includeBenchmarks: boolean = true) {
  return useCachedPromise(
    async (justCanonicals: boolean, includeBenchmarks: boolean) => {
      return api.getModels(justCanonicals, includeBenchmarks);
    },
    [justCanonicals, includeBenchmarks],
  );
}

/**
 * Helper function to find a model by ID
 * @param models - Array of models
 * @param modelId - The model ID to find
 * @returns The model if found, undefined otherwise
 */
export function findModelById(models: ModelListItem[] | undefined, modelId: string): ModelListItem | undefined {
  if (!models) return undefined;
  return models.find((model) => model.model_id === modelId);
}
