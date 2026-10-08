import { useCachedPromise } from "@raycast/utils";
import { ZeroEvalAPI } from "./zeroeval-api";

const api = new ZeroEvalAPI();

/**
 * Hook to fetch and cache the list of all models
 * @param justCanonicals - Return only canonical models (default: true)
 * @param includeBenchmarks - Include benchmark data (default: true)
 */
export function useModels(justCanonicals: boolean = true, includeBenchmarks: boolean = true, execute: boolean = true) {
  return useCachedPromise(
    async (justCanonicals: boolean, includeBenchmarks: boolean) => {
      return api.getModels(justCanonicals, includeBenchmarks);
    },
    [justCanonicals, includeBenchmarks],
    { execute },
  );
}
