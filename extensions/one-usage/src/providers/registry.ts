import { Image, getPreferenceValues } from "@raycast/api";
import { MetricLine, ProviderResult } from "../types";
import { fetchClaude } from "./claude";
import { fetchCodex } from "./codex";
import { fetchCursor } from "./cursor";

export interface ProviderMeta {
  name: string;
  icon: Image.ImageLike;
  usageUrl: string;
  statusUrl: string;
  fetch: () => Promise<MetricLine[]>;
}

export const PROVIDER_META: Record<string, ProviderMeta> = {
  claude: {
    name: "Claude",
    icon: "provider-icons/claude.svg",
    usageUrl: "https://platform.claude.com/settings/billing",
    statusUrl: "https://status.claude.com/",
    fetch: fetchClaude,
  },
  codex: {
    name: "Codex",
    icon: "provider-icons/codex.svg",
    usageUrl: "https://chatgpt.com/codex/settings/usage",
    statusUrl: "https://status.openai.com/",
    fetch: fetchCodex,
  },
  cursor: {
    name: "Cursor",
    icon: "provider-icons/cursor.svg",
    usageUrl: "https://cursor.com/dashboard?tab=usage",
    statusUrl: "https://status.cursor.com/",
    fetch: fetchCursor,
  },
};

const PROVIDER_IDS = Object.keys(PROVIDER_META);

const getPreferenceMap = (): Record<string, boolean> => {
  const prefs = getPreferenceValues<Preferences>();
  return {
    claude: prefs.enableClaude,
    codex: prefs.enableCodex,
    cursor: prefs.enableCursor,
  };
};

export const isProviderEnabled = (id: string): boolean => getPreferenceMap()[id] ?? false;

export const getEnabledProviderIds = (): string[] => {
  const enabled = getPreferenceMap();
  return PROVIDER_IDS.filter((id) => enabled[id]);
};

export const fetchAllProviders = async (): Promise<ProviderResult[]> => {
  const ids = getEnabledProviderIds();
  if (ids.length === 0) return [];

  const results = await Promise.allSettled(ids.map((id) => PROVIDER_META[id].fetch()));

  return ids.map((id, i) => {
    const result = results[i];
    const { name } = PROVIDER_META[id];
    return result.status === "fulfilled"
      ? { id, name, lines: result.value }
      : { id, name, error: result.reason instanceof Error ? result.reason.message : String(result.reason) };
  });
};
