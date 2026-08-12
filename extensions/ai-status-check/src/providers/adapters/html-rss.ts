import { deriveProviderHealth } from "../../domain/derive-health";
import type { Incident } from "../../domain/types";
import { parseIncidentRss } from "../parsers/incident-rss";
import type { ParsedRenderedStatus } from "../parsers/rendered-status";
import { fetchText, type FetchText } from "../utils/http";
import type { ProviderAdapter, ProviderAdapterConfig } from "../types";

export interface HtmlRssAdapterConfig extends ProviderAdapterConfig {
  pageUrl?: string;
  feedUrl: string;
  parsePage: (html: string) => ParsedRenderedStatus;
  parseFeed?: (xml: string) => Incident[];
  fetchText?: FetchText;
}

export function createHtmlRssAdapter(config: HtmlRssAdapterConfig): ProviderAdapter {
  const request = config.fetchText ?? fetchText;
  const now = config.now ?? (() => new Date());

  return {
    async fetch(signal) {
      const [page, feed] = await Promise.all([
        request(config.pageUrl ?? config.statusPageUrl, signal).then(config.parsePage),
        request(config.feedUrl, signal),
      ]);
      const incidents = (config.parseFeed ?? parseIncidentRss)(feed);
      const components = page.components;
      if (components.length === 0) throw new Error("Status adapter contained no components");
      const pageHealth = page.reportedHealth;
      const reportedHealth =
        pageHealth === "unknown" && incidents.every((incident) => incident.state === "resolved")
          ? "operational"
          : pageHealth;

      return {
        providerId: config.providerId,
        health: deriveProviderHealth(reportedHealth, components, incidents),
        statusText: page.statusText,
        components,
        incidents,
        fetchedAt: now().toISOString(),
      };
    },
  };
}
