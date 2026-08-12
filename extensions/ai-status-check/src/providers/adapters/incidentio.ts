import type { Incident } from "../../domain/types";
import { parseIncidentIoIncidents, parseIncidentIoSummary, type ParsedIncidentIoSummary } from "../parsers/incidentio";
import type { ProviderAdapter, ProviderAdapterConfig } from "../types";
import { fetchJson, type FetchJson } from "../utils/http";
import { mergeIncidents } from "../utils/incidents";

export interface IncidentIoAdapterConfig extends ProviderAdapterConfig {
  /** Override only when a page's Incident.io proxy route differs from the standard host-derived route. */
  proxyUrl?: string;
  /** Override only when incident history is exposed at a non-standard route. */
  incidentsUrl?: string;
  parseSummary?: (payload: unknown) => ParsedIncidentIoSummary;
  parseIncidents?: (payload: unknown, statusPageUrl: string) => Incident[];
  fetchJson?: FetchJson;
}

export function createIncidentIoAdapter(config: IncidentIoAdapterConfig): ProviderAdapter {
  const request = config.fetchJson ?? fetchJson;
  const now = config.now ?? (() => new Date());
  const statusPageUrl = new URL(config.statusPageUrl);
  const proxyUrl = config.proxyUrl ?? new URL(`proxy/${statusPageUrl.host}`, statusPageUrl).toString();
  const incidentsUrl = config.incidentsUrl ?? `${proxyUrl}/incidents`;
  const parseSummary = config.parseSummary ?? parseIncidentIoSummary;
  const parseIncidents = config.parseIncidents ?? parseIncidentIoIncidents;

  return {
    async fetch(signal) {
      const [proxyPayload, incidentsPayload] = await Promise.all([
        request(proxyUrl, signal),
        request(incidentsUrl, signal),
      ]);
      const summary = parseSummary(proxyPayload);
      const incidents = mergeIncidents(parseIncidents(incidentsPayload, config.statusPageUrl), summary.incidents);

      return {
        providerId: config.providerId,
        health: summary.reportedHealth,
        statusText: summary.statusText,
        components: summary.components,
        incidents,
        fetchedAt: now().toISOString(),
      };
    },
  };
}
