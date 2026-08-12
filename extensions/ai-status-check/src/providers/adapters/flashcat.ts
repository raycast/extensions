import { deriveProviderHealth } from "../../domain/derive-health";
import { parseFlashcatStatus } from "../parsers/flashcat";
import { fetchJson, type FetchJson } from "../utils/http";
import type { ProviderAdapter, ProviderAdapterConfig } from "../types";

export interface FlashcatAdapterConfig extends ProviderAdapterConfig {
  pageId: string;
  apiBaseUrl?: string;
  fetchJson?: FetchJson;
}

export function createFlashcatAdapter(config: FlashcatAdapterConfig): ProviderAdapter {
  const request = config.fetchJson ?? fetchJson;
  const now = config.now ?? (() => new Date());

  return {
    async fetch(signal) {
      const fetchedAt = now();
      const endAt = Math.floor(fetchedAt.getTime() / 1000);
      const startAt = endAt - 90 * 86_400;
      const apiBaseUrl = config.apiBaseUrl ?? "https://statuspage.flashcat.cloud/api/status-page";
      const sourceBase = `${apiBaseUrl.replace(/\/+$/, "")}/${encodeURIComponent(config.pageId)}`;
      const [currentPayload, historyPayload] = await Promise.all([
        request(`${sourceBase}/summary/active`, signal),
        request(`${sourceBase}/change/list?start_at_seconds=${startAt}&end_at_seconds=${endAt}`, signal),
      ]);
      const parsed = parseFlashcatStatus(currentPayload, historyPayload, config.statusPageUrl);
      const health = deriveProviderHealth(parsed.reportedHealth, parsed.components, parsed.incidents);

      return {
        providerId: config.providerId,
        health,
        components: parsed.components,
        incidents: parsed.incidents,
        fetchedAt: fetchedAt.toISOString(),
      };
    },
  };
}
