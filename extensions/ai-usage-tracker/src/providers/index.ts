import { getPreferenceValues } from "@raycast/api";
import { ProviderUsage, ProviderType, Preferences } from "../types";
import { fetchClaudeUsage } from "./claude";
import { fetchCodexUsage } from "./codex";
import { fetchAntigravityUsage } from "./antigravity";
import { getCachedUsage, setCachedUsage } from "../utils/storage";

export { fetchClaudeUsage } from "./claude";
export { fetchCodexUsage } from "./codex";
export { fetchAntigravityUsage } from "./antigravity";

const PROVIDER_FETCHERS: Record<ProviderType, () => Promise<ProviderUsage>> = {
  claude: fetchClaudeUsage,
  codex: fetchCodexUsage,
  antigravity: fetchAntigravityUsage,
};

export function getEnabledProviders(): ProviderType[] {
  const prefs = getPreferenceValues<Preferences>();
  const enabled: ProviderType[] = [];

  if (prefs.claudeEnabled) enabled.push("claude");
  if (prefs.codexEnabled) enabled.push("codex");
  if (prefs.antigravityEnabled) enabled.push("antigravity");

  return enabled;
}

export async function fetchProviderUsage(
  provider: ProviderType,
  useCache = true,
): Promise<ProviderUsage> {
  if (useCache) {
    const cached = await getCachedUsage(provider);
    if (cached) return cached;
  }

  const fetcher = PROVIDER_FETCHERS[provider];
  const usage = await fetcher();

  if (usage.authenticated && !usage.error) {
    await setCachedUsage(provider, usage);
  }

  return usage;
}

export async function fetchAllProviderUsage(
  useCache = true,
): Promise<ProviderUsage[]> {
  const enabledProviders = getEnabledProviders();
  const results = await Promise.all(
    enabledProviders.map((provider) => fetchProviderUsage(provider, useCache)),
  );
  return results;
}
