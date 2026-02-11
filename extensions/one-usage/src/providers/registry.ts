import { Color, Image, getPreferenceValues } from "@raycast/api";
import { ProviderConfig, ProviderResult } from "../types";
import { fetchClaude } from "./claude";
import { fetchCodex } from "./codex";
import { fetchCursor } from "./cursor";

// Preferences

interface BasePreferences {
  enableClaude: boolean;
  enableCodex: boolean;
  enableCursor: boolean;
}

// Provider Metadata

export interface ProviderMeta {
  name: string;
  icon: Image.ImageLike;
  color: Color;
  url: string;
}

export const PROVIDER_META: Record<string, ProviderMeta> = {
  claude: { name: "Claude", icon: "provider-icons/claude.svg", color: Color.Orange, url: "https://claude.ai" },
  codex: { name: "Codex", icon: "provider-icons/codex.svg", color: Color.Green, url: "https://chatgpt.com" },
  cursor: { name: "Cursor", icon: "provider-icons/cursor.svg", color: Color.Blue, url: "https://cursor.sh" },
};

// Provider Registry

function getEnabledProviders(): ProviderConfig[] {
  const prefs = getPreferenceValues<Preferences>();

  const all: ProviderConfig[] = [
    { id: "claude", name: "Claude", enabled: prefs.enableClaude, fetch: fetchClaude },
    { id: "codex", name: "Codex", enabled: prefs.enableCodex, fetch: fetchCodex },
    { id: "cursor", name: "Cursor", enabled: prefs.enableCursor, fetch: fetchCursor },
  ];

  return all.filter((p) => p.enabled);
}

// Data Fetching

/**
 * Fetch usage data from all enabled providers in parallel.
 * Returns a ProviderResult for each enabled provider, including errors.
 */
export async function fetchAllProviders(): Promise<ProviderResult[]> {
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
}
