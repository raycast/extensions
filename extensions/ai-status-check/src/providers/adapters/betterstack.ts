import { deriveProviderHealth } from "../../domain/derive-health";
import { withoutTrailingSlash } from "../../utils/url";
import { parseBetterStack } from "../parsers/betterstack";
import { fetchJson, type FetchJson } from "../utils/http";
import type { ProviderAdapter, ProviderAdapterConfig } from "../types";

export interface BetterStackAdapterConfig extends ProviderAdapterConfig {
  indexUrl?: string;
  fetchJson?: FetchJson;
}

export function createBetterStackAdapter(config: BetterStackAdapterConfig): ProviderAdapter {
  const request = config.fetchJson ?? fetchJson;
  const now = config.now ?? (() => new Date());

  return {
    async fetch(signal) {
      const statusPageUrl = withoutTrailingSlash(config.statusPageUrl);
      const parsed = parseBetterStack(await request(config.indexUrl ?? `${statusPageUrl}/index.json`, signal));
      return {
        providerId: config.providerId,
        health: deriveProviderHealth(parsed.reportedHealth, parsed.components, parsed.incidents),
        statusText: parsed.statusText,
        components: parsed.components,
        incidents: parsed.incidents.map((incident) => ({
          ...incident,
          url: `${statusPageUrl}/incident/${encodeURIComponent(incident.id)}`,
        })),
        fetchedAt: now().toISOString(),
      };
    },
  };
}
