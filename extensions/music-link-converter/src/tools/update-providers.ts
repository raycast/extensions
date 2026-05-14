import type { ProviderConfig } from "../lib/types";
import { getProviders, saveProviders } from "../lib/store";

type Input = {
  /**
   * Array of provider names or keys to update. Can be provider names like "Spotify", "Apple Music", "Deezer"
   * or provider keys like "spotify", "appleMusic", "deezer". Matching is case-insensitive.
   * Examples: ["Spotify", "Deezer"] or ["spotify", "deezer"] or ["Spotify", "deezer"]
   */
  providers: string[];
  /**
   * The action to perform on the providers. Use "enable" to enable providers or "disable" to disable them.
   */
  action: "enable" | "disable";
};

/**
 * Helper function to find a provider by name or key (case-insensitive)
 */
function findProvider(providers: ProviderConfig[], nameOrKey: string): ProviderConfig | null {
  const normalized = nameOrKey.toLowerCase().trim();
  return (
    providers.find(
      (p) =>
        p.key.toLowerCase() === normalized ||
        p.label.toLowerCase() === normalized ||
        p.label.toLowerCase().replace(/\s+/g, "") === normalized,
    ) || null
  );
}

/**
 * Tool to enable or disable music providers.
 *
 * This tool allows you to enable or disable multiple providers at once.
 * You can reference providers by their name (e.g., "Spotify", "Apple Music")
 * or by their key (e.g., "spotify", "appleMusic"). Matching is case-insensitive.
 *
 * Examples:
 * - To disable Spotify and Deezer: { providers: ["Spotify", "Deezer"], action: "disable" }
 * - To enable Apple Music: { providers: ["Apple Music"], action: "enable" }
 * - To disable YouTube Music and Tidal: { providers: ["youtubeMusic", "Tidal"], action: "disable" }
 *
 * @param input - Object containing providers array and action (enable/disable)
 * @returns Object with success status, updated providers, and any errors for providers not found
 */
async function updateProviders(input: Input): Promise<{
  success: boolean;
  updated: Array<{ key: string; label: string; enabled: boolean }>;
  notFound: string[];
}> {
  const { providers: providerNames, action } = input;
  const allProviders = await getProviders();
  const updated: Array<{ key: string; label: string; enabled: boolean }> = [];
  const notFound: string[] = [];

  // Process each provider name
  for (const nameOrKey of providerNames) {
    const provider = findProvider(allProviders, nameOrKey);
    if (provider) {
      const providerIndex = allProviders.findIndex((p) => p.key === provider.key);
      if (providerIndex !== -1) {
        const newEnabled = action === "enable";
        allProviders[providerIndex] = {
          ...allProviders[providerIndex],
          enabled: newEnabled,
        };
        updated.push({
          key: provider.key,
          label: provider.label,
          enabled: newEnabled,
        });
      }
    } else {
      notFound.push(nameOrKey);
    }
  }

  // Save updated providers if any were found
  if (updated.length > 0) {
    await saveProviders(allProviders);
  }

  return {
    success: updated.length > 0,
    updated,
    notFound,
  };
}

/**
 * Confirmation function to show what providers will be updated before executing
 */
export const confirmation = async (input: Input) => {
  const actionText = input.action === "enable" ? "enable" : "disable";
  const providersText = input.providers.join(", ");

  return {
    message: `Are you sure you want to ${actionText} the following providers: ${providersText}?`,
    info: [
      {
        name: "Action",
        value: input.action,
      },
      {
        name: "Providers",
        value: providersText,
      },
    ],
  };
};

export default updateProviders;
