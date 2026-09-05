import { deriveProviderHealth } from "../../domain/derive-health";
import type {
  ComponentHistoryDay,
  ComponentStatus,
  Health,
  Incident,
  IncidentState,
  IncidentUpdate,
} from "../../domain/types";
import { parseTimestamp } from "../../utils/dates";
import { normalizeStatusToken } from "../../utils/status-token";
import { withTrailingSlash } from "../../utils/url";
import { componentHistory, finitePercent, publishedPercentText } from "../utils/component-history";
import { fetchJson, fetchText, type FetchJson, type FetchText } from "../utils/http";
import { sortIncidentsByActivity } from "../utils/incidents";
import { fetchOptionalEnrichment } from "../utils/optional-enrichment";
import { optionalRecordArray, optionalString, requireRecord, type JsonRecord } from "../utils/runtime-values";
import { mapFlexibleHealth } from "../utils/status-normalization";
import type { ProviderAdapter, ProviderAdapterConfig } from "../types";

export interface StatuspageAdapterConfig extends ProviderAdapterConfig {
  endpoints?: Partial<StatuspageEndpoints>;
  componentFilter?: (component: ComponentStatus) => boolean;
  incidentFilter?: (incident: Incident) => boolean;
  fetchJson?: FetchJson;
  fetchText?: FetchText;
}

export interface StatuspageEndpoints {
  summary: string;
  incidents: string;
  maintenances: string;
}

export function createStatuspageAdapter(config: StatuspageAdapterConfig): ProviderAdapter {
  const fetchJsonResponse = config.fetchJson ?? fetchJson;
  const fetchTextResponse = config.fetchText ?? fetchText;
  const now = config.now ?? (() => new Date());
  const endpoints = statuspageEndpoints(config.statusPageUrl, config.endpoints);

  return {
    async fetch(signal) {
      const [summaryPayload, incidentsPayload, maintenancesPayload, statusPageHtml] = await Promise.all([
        fetchJsonResponse(endpoints.summary, signal),
        fetchJsonResponse(endpoints.incidents, signal),
        fetchJsonResponse(endpoints.maintenances, signal),
        fetchOptionalEnrichment(signal, (historySignal) => fetchTextResponse(config.statusPageUrl, historySignal)),
      ]);
      const fetchedAt = now();

      const summary = parseSummary(summaryPayload);
      const uptimeData = parseStatuspageUptimeHtml(statusPageHtml ?? "");
      const incidents = sortIncidentsByActivity([
        ...parseIncidents(incidentsPayload, config.statusPageUrl),
        ...parseScheduledMaintenances(maintenancesPayload, config.statusPageUrl),
      ]).filter((incident) => config.incidentFilter?.(incident) ?? true);
      const components = summary.components
        .filter((component) => config.componentFilter?.(component) ?? true)
        .map((component) => {
          const history = statuspageComponentHistory(uptimeData[component.id]);
          return history ? { ...component, history } : component;
        });
      const isScopedProvider = Boolean(config.componentFilter || config.incidentFilter);
      const health = deriveProviderHealth(isScopedProvider ? "unknown" : summary.reportedHealth, components, incidents);

      return {
        providerId: config.providerId,
        health,
        statusText: isScopedProvider ? undefined : summary.statusText,
        components,
        incidents,
        fetchedAt: fetchedAt.toISOString(),
      };
    },
  };
}

interface StatuspageUptimeDay {
  date?: unknown;
  outages?: unknown;
}

interface StatuspageUptimeComponent {
  component?: { startDate?: unknown };
  days?: StatuspageUptimeDay[];
  uptimeText?: unknown;
}

type StatuspageUptimeData = Record<string, StatuspageUptimeComponent>;

/** Parse the official day-level availability data embedded by Statuspage. */
export function parseStatuspageUptimeHtml(html: string): StatuspageUptimeData {
  const marker = "window.uptimeData = ";
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) return {};
  const openIndex = html.indexOf("{", markerIndex + marker.length);
  if (openIndex === -1) return {};
  const objectText = extractBalancedObject(html, openIndex);
  if (!objectText) return {};
  try {
    const parsed: unknown = JSON.parse(objectText);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const uptimeData = parsed as StatuspageUptimeData;
    for (const match of html.matchAll(
      /<span\s+id="uptime-percent-([^"]+)"[^>]*>[\s\S]*?<var\s+data-var="uptime-percent"[^>]*>\s*([\d.]+)\s*<\/var>/gi,
    )) {
      const componentId = match[1];
      const uptimeText = match[2];
      const component = componentId ? uptimeData[componentId] : undefined;
      if (component && uptimeText) component.uptimeText = uptimeText;
    }
    return uptimeData;
  } catch {
    return {};
  }
}

function statuspageComponentHistory(value: StatuspageUptimeComponent | undefined) {
  if (!Array.isArray(value?.days) || value.days.length === 0) return undefined;
  const monitoredSince = sourceDate(value.component?.startDate);
  const days = value.days.flatMap<ComponentHistoryDay>((day) => {
    const date = typeof day.date === "string" ? day.date.slice(0, 10) : undefined;
    if (!date) return [];
    if (monitoredSince && date < monitoredSince) return [{ date, level: "not_monitored" as const }];

    const outages = day.outages && typeof day.outages === "object" ? (day.outages as Record<string, unknown>) : {};
    const major = nonNegativeNumber(outages.m);
    const partial = nonNegativeNumber(outages.p);
    const weightedDayDowntime = major + partial * 0.3;
    return [
      {
        date,
        level: statuspageDayLevel(weightedDayDowntime),
      },
    ];
  });
  if (days.length === 0) return undefined;
  const publishedUptime = finitePercent(value.uptimeText);
  return componentHistory("availability", days, {
    uptimePercent: publishedUptime,
    uptimeText: publishedPercentText(value.uptimeText),
    monitoredSince,
  });
}

function statuspageDayLevel(weightedDowntimeSeconds: number) {
  if (weightedDowntimeSeconds <= 0) return "operational" as const;
  if (weightedDowntimeSeconds <= 20 * 60) return "degraded" as const;
  if (weightedDowntimeSeconds <= 40 * 60) return "partial_outage" as const;
  return "major_outage" as const;
}

function sourceDate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const date = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
}

function nonNegativeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function extractBalancedObject(text: string, openIndex: number): string | undefined {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = openIndex; index < text.length; index += 1) {
    const character = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (character === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (character === "{") depth += 1;
    if (character === "}" && --depth === 0) return text.slice(openIndex, index + 1);
  }
  return undefined;
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

export interface ParsedStatuspageSummary {
  reportedHealth: Health;
  statusText?: string;
  components: ComponentStatus[];
}

export function parseSummary(payload: unknown): ParsedStatuspageSummary {
  const root = requireRecord(payload, "status summary");
  const status = requireRecord(root.status, "status summary status");
  const indicator = optionalString(status.indicator);
  const description = optionalString(status.description);

  if (!indicator && !description) throw new Error("Status summary did not contain an overall status");

  const components = optionalRecordArray(root.components)
    .map(parseComponent)
    .filter((component): component is ComponentStatus => component !== undefined);

  return {
    reportedHealth: mapFlexibleHealth(indicator ?? description),
    statusText: description,
    components,
  };
}

export function parseIncidents(payload: unknown, statusPageUrl: string): Incident[] {
  const root = requireRecord(payload, "incident history");
  return parseIncidentList(root.incidents, statusPageUrl);
}

export function parseScheduledMaintenances(payload: unknown, statusPageUrl: string): Incident[] {
  const root = requireRecord(payload, "scheduled maintenance history");
  return parseIncidentList(root.scheduled_maintenances, statusPageUrl);
}

function parseIncidentList(value: unknown, statusPageUrl: string): Incident[] {
  return optionalRecordArray(value)
    .map((incident) => parseIncident(incident, statusPageUrl))
    .filter((incident): incident is Incident => incident !== undefined)
    .sort((left, right) => parseTimestamp(right.startedAt) - parseTimestamp(left.startedAt));
}

function parseComponent(component: JsonRecord): ComponentStatus | undefined {
  const id = optionalString(component.id);
  const name = optionalString(component.name);
  const statusText = optionalString(component.status);
  if (!id || !name || !statusText) return undefined;

  return {
    id,
    name,
    health: mapFlexibleHealth(statusText),
    statusText,
    group: optionalString(component.group_name),
  };
}

function parseIncident(incident: JsonRecord, statusPageUrl: string): Incident | undefined {
  const id = optionalString(incident.id);
  const title = optionalString(incident.name);
  if (!id || !title) return undefined;

  const stateText = optionalString(incident.status);
  const state = mapIncidentState(stateText);
  const impactText = optionalString(incident.impact);
  const updates = optionalRecordArray(incident.incident_updates)
    .map(parseIncidentUpdate)
    .filter((update): update is IncidentUpdate => update !== undefined);
  const affectedComponentIds = new Set<string>();

  for (const component of optionalRecordArray(incident.components)) {
    const componentId = optionalString(component.id);
    if (componentId) affectedComponentIds.add(componentId);
  }

  for (const update of optionalRecordArray(incident.incident_updates)) {
    for (const component of optionalRecordArray(update.affected_components)) {
      const componentId = optionalString(component.code) ?? optionalString(component.id);
      if (componentId) affectedComponentIds.add(componentId);
    }
  }

  const shortlink = optionalString(incident.shortlink);

  return {
    id,
    title,
    state,
    health: state === "scheduled" ? "maintenance" : mapIncidentImpact(impactText),
    stateText,
    impactText,
    startedAt:
      optionalString(incident.started_at) ??
      optionalString(incident.scheduled_for) ??
      optionalString(incident.created_at),
    updatedAt: optionalString(incident.updated_at),
    resolvedAt: optionalString(incident.resolved_at),
    affectedComponentIds: [...affectedComponentIds],
    updates,
    url: shortlink ?? new URL(`incidents/${encodeURIComponent(id)}`, withTrailingSlash(statusPageUrl)).toString(),
  };
}

function parseIncidentUpdate(update: JsonRecord): IncidentUpdate | undefined {
  const id = optionalString(update.id);
  const body = optionalString(update.body);
  const createdAt =
    optionalString(update.display_at) ?? optionalString(update.created_at) ?? optionalString(update.updated_at);
  if (!id || !body || !createdAt) return undefined;

  const stateText = optionalString(update.status);
  return {
    id,
    body,
    createdAt,
    state: mapIncidentState(stateText),
    stateText,
  };
}

function mapIncidentImpact(value: string | undefined): Health {
  if (!value) return "unknown";
  return mapFlexibleHealth(value);
}

function mapIncidentState(value: string | undefined): IncidentState {
  switch (normalizeStatusToken(value ?? "")) {
    case "investigating":
      return "investigating";
    case "identified":
      return "identified";
    case "monitoring":
      return "monitoring";
    case "resolved":
    case "completed":
      return "resolved";
    case "scheduled":
    case "in_progress":
      return "scheduled";
    default:
      return "unknown";
  }
}
