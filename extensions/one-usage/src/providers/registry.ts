import { Image, getPreferenceValues } from "@raycast/api";
import { MetricLine, ProviderConfig, ProviderResult } from "../types";
import { fetchClaude } from "./claude";
import { fetchCodex } from "./codex";
import { fetchCursor } from "./cursor";

export interface ProviderMeta {
  name: string;
  icon: Image.ImageLike;
  usageUrl: string;
  statusUrl: string;
}

export const PROVIDER_META: Record<string, ProviderMeta> = {
  claude: {
    name: "Claude",
    icon: "provider-icons/claude.svg",
    usageUrl: "https://platform.claude.com/settings/billing",
    statusUrl: "https://status.claude.com/",
  },
  codex: {
    name: "Codex",
    icon: "provider-icons/codex.svg",
    usageUrl: "https://chatgpt.com/codex/settings/usage",
    statusUrl: "https://status.openai.com/",
  },
  cursor: {
    name: "Cursor",
    icon: "provider-icons/cursor.svg",
    usageUrl: "https://cursor.com/dashboard?tab=usage",
    statusUrl: "https://status.cursor.com/",
  },
};

const PROVIDER_IDS = Object.keys(PROVIDER_META) as string[];
const FETCHERS: Record<string, () => Promise<MetricLine[]>> = {
  claude: fetchClaude,
  codex: fetchCodex,
  cursor: fetchCursor,
};

const getPreferenceMap = (): Record<string, boolean> => {
  const prefs = getPreferenceValues<Preferences>();
  return {
    claude: prefs.enableClaude,
    codex: prefs.enableCodex,
    cursor: prefs.enableCursor,
  };
};

export const isProviderEnabled = (providerId: string): boolean => getPreferenceMap()[providerId] ?? false;

export const getEnabledProviderIds = (): string[] => PROVIDER_IDS.filter((id) => getPreferenceMap()[id]);

const getEnabledProviders = (): ProviderConfig[] => {
  const enabled = getPreferenceMap();
  return PROVIDER_IDS.filter((id) => enabled[id]).map((id) => ({
    id,
    name: PROVIDER_META[id].name,
    enabled: true,
    fetch: FETCHERS[id],
  }));
};

export const fetchAllProviders = async (): Promise<ProviderResult[]> => {
  const providers = getEnabledProviders();
  if (providers.length === 0) return [];

  const results = await Promise.allSettled(providers.map((p) => p.fetch()));

  return providers.map((provider, index) => {
    const result = results[index];
    if (result.status === "fulfilled") {
      return { id: provider.id, name: provider.name, lines: result.value };
    }
    return {
      id: provider.id,
      name: provider.name,
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
    };
  });
};
