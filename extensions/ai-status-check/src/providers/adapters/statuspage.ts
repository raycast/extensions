import { deriveProviderHealth } from "../../domain/derive-health";
import type { ComponentStatus, Incident } from "../../domain/types";
import {
  parseIncidents,
  parseScheduledMaintenances,
  parseSummary,
  type ParsedStatuspageSummary,
} from "../parsers/statuspage";
import { fetchJson, type FetchJson } from "../utils/http";
import { sortIncidentsByActivity } from "../utils/incidents";
import type { ProviderAdapter, ProviderAdapterConfig } from "../types";

export interface StatuspageAdapterConfig extends ProviderAdapterConfig {
  endpoints?: Partial<StatuspageEndpoints>;
  parseSummary?: (payload: unknown) => ParsedStatuspageSummary;
  parseIncidents?: (payload: unknown, statusPageUrl: string) => Incident[];
  parseMaintenances?: (payload: unknown, statusPageUrl: string) => Incident[];
  componentFilter?: (component: ComponentStatus) => boolean;
  incidentFilter?: (incident: Incident) => boolean;
  fetchJson?: FetchJson;
}

export interface StatuspageEndpoints {
  summary: string;
  incidents: string;
  maintenances: string;
}

export function createStatuspageAdapter(config: StatuspageAdapterConfig): ProviderAdapter {
  const fetchJsonResponse = config.fetchJson ?? fetchJson;
  const now = config.now ?? (() => new Date());
  const endpoints = statuspageEndpoints(config.statusPageUrl, config.endpoints);
  const parseSummaryPayload = config.parseSummary ?? parseSummary;
  const parseIncidentsPayload = config.parseIncidents ?? parseIncidents;
  const parseMaintenancesPayload = config.parseMaintenances ?? parseScheduledMaintenances;

  return {
    async fetch(signal) {
      const [summaryPayload, incidentsPayload, maintenancesPayload] = await Promise.all([
        fetchJsonResponse(endpoints.summary, signal),
        fetchJsonResponse(endpoints.incidents, signal),
        fetchJsonResponse(endpoints.maintenances, signal),
      ]);

      const summary = parseSummaryPayload(summaryPayload);
      const incidents = sortIncidentsByActivity([
        ...parseIncidentsPayload(incidentsPayload, config.statusPageUrl),
        ...parseMaintenancesPayload(maintenancesPayload, config.statusPageUrl),
      ]).filter((incident) => config.incidentFilter?.(incident) ?? true);
      const components = summary.components.filter((component) => config.componentFilter?.(component) ?? true);
      const isScopedProvider = Boolean(config.componentFilter || config.incidentFilter);
      const health = deriveProviderHealth(isScopedProvider ? "unknown" : summary.reportedHealth, components, incidents);

      return {
        providerId: config.providerId,
        health,
        statusText: isScopedProvider ? undefined : summary.statusText,
        components,
        incidents,
        fetchedAt: now().toISOString(),
      };
    },
  };
}

export function statuspageEndpoints(
  statusPageUrl: string,
  overrides: Partial<StatuspageEndpoints> = {},
): StatuspageEndpoints {
  return {
    summary: overrides.summary ?? new URL("api/v2/summary.json", statusPageUrl).toString(),
    incidents: overrides.incidents ?? new URL("api/v2/incidents.json", statusPageUrl).toString(),
    maintenances: overrides.maintenances ?? new URL("api/v2/scheduled-maintenances.json", statusPageUrl).toString(),
  };
}
