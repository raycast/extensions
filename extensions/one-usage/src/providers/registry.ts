import { Image, getPreferenceValues } from "@raycast/api";
import { ProviderConfig, ProviderResult } from "../types";
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

export function isProviderEnabled(providerId: string): boolean {
  const prefs = getPreferenceValues<Preferences>();
  const map: Record<string, boolean> = {
    claude: prefs.enableClaude,
    codex: prefs.enableCodex,
    cursor: prefs.enableCursor,
  };
  return map[providerId] ?? false;
}

export function getEnabledProviderIds(): string[] {
  const prefs = getPreferenceValues<Preferences>();
  const ids: string[] = [];
  if (prefs.enableClaude) ids.push("claude");
  if (prefs.enableCodex) ids.push("codex");
  if (prefs.enableCursor) ids.push("cursor");
  return ids;
}

function getEnabledProviders(): ProviderConfig[] {
  const prefs = getPreferenceValues<Preferences>();

  const all: ProviderConfig[] = [
    { id: "claude", name: "Claude", enabled: prefs.enableClaude, fetch: fetchClaude },
    { id: "codex", name: "Codex", enabled: prefs.enableCodex, fetch: fetchCodex },
    { id: "cursor", name: "Cursor", enabled: prefs.enableCursor, fetch: fetchCursor },
  ];

  return all.filter((p) => p.enabled);
}

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
