import { deriveProviderHealth } from "../../domain/derive-health";
import { withoutTrailingSlash } from "../../utils/url";
import { parseInstatus, parseInstatusHistory } from "../parsers/instatus";
import { fetchJson, fetchText, type FetchJson, type FetchText } from "../utils/http";
import type { ProviderAdapter, ProviderAdapterConfig } from "../types";

export interface InstatusAdapterConfig extends ProviderAdapterConfig {
  summaryUrl?: string;
  componentsUrl?: string;
  historyUrl?: string;
  fetchJson?: FetchJson;
  fetchText?: FetchText;
}

export function createInstatusAdapter(config: InstatusAdapterConfig): ProviderAdapter {
  const request = config.fetchJson ?? fetchJson;
  const requestText = config.fetchText ?? fetchText;
  const now = config.now ?? (() => new Date());
  const baseUrl = withoutTrailingSlash(config.statusPageUrl);

  return {
    async fetch(signal) {
      const [summaryPayload, componentsPayload, historyFeed] = await Promise.all([
        request(config.summaryUrl ?? `${baseUrl}/v3/summary.json`, signal),
        request(config.componentsUrl ?? `${baseUrl}/v3/components.json`, signal),
        requestText(config.historyUrl ?? `${baseUrl}/history.rss`, signal),
      ]);
      const parsed = parseInstatus(summaryPayload, componentsPayload);
      const incidents = parseInstatusHistory(historyFeed, parsed.components);

      return {
        providerId: config.providerId,
        health: deriveProviderHealth(parsed.reportedHealth, parsed.components, incidents),
        statusText: parsed.statusText,
        components: parsed.components,
        incidents,
        fetchedAt: now().toISOString(),
      };
    },
  };
}
