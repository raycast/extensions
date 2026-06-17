import { useMemo } from "react";
import { OpenRouterModel } from "../types";
import { getProviderIcon } from "../lib/get-icon";

type ProviderOption = { id: string; name: string; icon?: string };

export function useProviders(allModels: OpenRouterModel[] = []): ProviderOption[] {
  return useMemo(() => {
    const providerMap = new Map<string, string>();

    // Collect providers and preserve the first encountered casing for each providerId
    allModels.forEach((model) => {
      const providerId = model.id.split("/")[0];
      if (providerId) {
        const lowerProviderId = providerId.toLowerCase();

        // If we haven't seen this provider yet, preserve the first encountered casing
        if (!providerMap.has(lowerProviderId)) {
          // Look for the provider name in the model name with proper casing
          // Split by colon first to get the provider part, then by spaces/dashes/underscores
          const beforeColon = model.name?.split(":")[0] || "";

          // First try exact match with the provider ID
          let providerInName = beforeColon?.split(/[\s\-_]/i).find((part) => part.toLowerCase() === lowerProviderId);

          // If no exact match, try with dashes removed from provider ID
          if (!providerInName) {
            const providerIdWithoutDashes = lowerProviderId.replace(/-/g, "");
            providerInName = beforeColon
              ?.split(/[\s\-_]/i)
              .find((part) => part.toLowerCase() === providerIdWithoutDashes);
          }

          if (providerInName) {
            providerMap.set(lowerProviderId, providerInName);
          } else {
            // Fallback to capitalizing the provider ID
            providerMap.set(lowerProviderId, providerId.charAt(0).toUpperCase() + providerId.slice(1));
          }
        }
      }
    });

    return Array.from(providerMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([providerId, providerName]) => ({
        id: providerId,
        name: providerName,
        icon: getProviderIcon(providerId),
      }));
  }, [allModels]);
}
