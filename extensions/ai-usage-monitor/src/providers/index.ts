import { getPreferenceValues } from "@raycast/api";
import { ProviderError, ProviderOutcome, UsageProvider } from "../core/models";
import { claudeProvider } from "./claude";
import { codexProvider } from "./codex";

export const allProviders: UsageProvider[] = [claudeProvider, codexProvider];

interface ProviderPreferences {
  showClaude?: boolean;
  showCodex?: boolean;
}

export function enabledProviders(): UsageProvider[] {
  const prefs = getPreferenceValues<ProviderPreferences>();
  const enabled = new Set<string>();
  if (prefs.showClaude !== false) enabled.add("claude");
  if (prefs.showCodex !== false) enabled.add("codex");
  return allProviders.filter((provider) => enabled.has(provider.id));
}

async function runProvider(provider: UsageProvider): Promise<ProviderOutcome> {
  try {
    return { ok: true, result: await provider.getUsage() };
  } catch (error) {
    if (error instanceof ProviderError) {
      return {
        ok: false,
        provider: provider.id,
        displayName: provider.displayName,
        reason: error.reason,
        detail: error.message,
      };
    }
    return {
      ok: false,
      provider: provider.id,
      displayName: provider.displayName,
      reason: "unknown",
      detail: error instanceof Error ? error.message : "Unexpected error.",
    };
  }
}

/**
 * Every provider is resolved independently so one failing account can never
 * blank out the other's numbers.
 */
export async function fetchAllUsage(providers: UsageProvider[] = enabledProviders()): Promise<ProviderOutcome[]> {
  return Promise.all(providers.map(runProvider));
}
