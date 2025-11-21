import { usePromise } from "@raycast/utils";
import { BiomeRule } from "../types/biome-schema";
import { fetchLatestBiomeRules } from "../api/fetch-biome-rules";
import {
  getCachedRules,
  setCachedRules,
  clearCache,
} from "../api/cache-manager";
import { biomeRulesFallback } from "../fallback/biome-rules-fallback";

type UseBiomeRulesResult = {
  rules: BiomeRule[];
  version: string;
  isLoading: boolean;
  error?: Error;
  changelog?: string;
  fetchedAt?: number;
  isFallback: boolean;
};

export function useBiomeRules(): UseBiomeRulesResult {
  const { data, isLoading, error } = usePromise(async () => {
    // Step 1: Check cache first, but validate it has proper metadata
    const cached = getCachedRules();

    if (cached && cached.rules.length > 0) {
      // Check if at least one rule has varied metadata (some should have recommended: false)
      const hasVariedMetadata = cached.rules.some((rule) => !rule.recommended);
      if (hasVariedMetadata) {
        console.log("Using cached rules with valid metadata");
        return { ...cached, isFallback: false };
      } else {
        console.log(
          "Cache exists but has invalid metadata structure, clearing and refetching",
        );
        clearCache();
      }
    }

    // Step 2: Fetch fresh data
    try {
      const fresh = await fetchLatestBiomeRules();
      setCachedRules(fresh);
      return { ...fresh, isFallback: false };
    } catch (fetchError) {
      // Step 3: Fallback to hardcoded rules
      const errorMsg =
        fetchError instanceof Error ? fetchError.message : String(fetchError);
      console.error("Failed to fetch rules, using fallback. Error:", errorMsg);
      return {
        version: "2.3.6",
        rules: biomeRulesFallback,
        fetchedAt: Date.now(),
        changelog: undefined,
        isFallback: true,
      };
    }
  });

  return {
    rules: data?.rules || biomeRulesFallback,
    version: data?.version || "2.3.6",
    isLoading,
    error: error instanceof Error ? error : undefined,
    changelog: data?.changelog,
    fetchedAt: data?.fetchedAt,
    isFallback: data?.isFallback ?? true,
  };
}
