import { highestHealth } from "../../domain/derive-health";
import type { ComponentStatus, Health, Incident, IncidentUpdate } from "../../domain/types";
import { parseTimestamp } from "../../utils/dates";
import { withTrailingSlash } from "../../utils/url";
import type { ProviderAdapter, ProviderAdapterConfig } from "../types";
import { fetchJson, type FetchJson } from "../utils/http";
import { mergeIncidents } from "../utils/incidents";
import { fetchOptionalEnrichment } from "../utils/optional-enrichment";
import {
  applyHistoryRange,
  componentHistory,
  finitePercent,
  historyLevelFromHealth,
  historyWindow,
  markBeforeMonitoredSince,
  publishedPercentText,
} from "../utils/component-history";
import {
  optionalRecord,
  optionalRecordArray,
  optionalString,
  requireRecord,
  type JsonRecord,
} from "../utils/runtime-values";
import { mapFlexibleHealth } from "../utils/status-normalization";

export interface IncidentIoAdapterConfig extends ProviderAdapterConfig {
  /** Override only when a page's Incident.io proxy route differs from the standard host-derived route. */
  proxyUrl?: string;
  /** Override only when incident history is exposed at a non-standard route. */
  incidentsUrl?: string;
  /** Override only when component history is exposed at a non-standard route. */
  componentImpactsUrl?: string;
  fetchJson?: FetchJson;
}

export function createIncidentIoAdapter(config: IncidentIoAdapterConfig): ProviderAdapter {
  const request = config.fetchJson ?? fetchJson;
  const now = config.now ?? (() => new Date());
  const statusPageUrl = new URL(config.statusPageUrl);
  const proxyUrl = config.proxyUrl ?? new URL(`proxy/${statusPageUrl.host}`, statusPageUrl).toString();
  const incidentsUrl = config.incidentsUrl ?? `${proxyUrl}/incidents`;

  return {
    async fetch(signal) {
      const [proxyPayload, incidentsPayload] = await Promise.all([
        request(proxyUrl, signal),
        request(incidentsUrl, signal),
      ]);
      const summary = parseIncidentIoSummary(proxyPayload);
      const fetchedAt = now();
      const impactsPayload = await fetchOptionalEnrichment(signal, (historySignal) =>
        request(
          config.componentImpactsUrl ?? componentImpactsUrl(proxyUrl, fetchedAt, summary.historyWindowDays),
          historySignal,
        ),
      );
      const incidents = mergeIncidents(
        parseIncidentIoIncidents(incidentsPayload, config.statusPageUrl),
        summary.incidents,
      );

      return {
        providerId: config.providerId,
        health: summary.reportedHealth,
        statusText: summary.statusText,
        components: attachComponentHistory(summary, impactsPayload, fetchedAt),
        incidents,
        fetchedAt: fetchedAt.toISOString(),
      };
    },
  };
}

export interface ParsedIncidentIoSummary {
  reportedHealth: Health;
  statusText?: string;
  components: ComponentStatus[];
  incidents: Incident[];
  historyWindowDays: number;
  displayUptimeMode?: string;
  historyVisibility: ReadonlyMap<string, { display: boolean; monitoredSince?: string }>;
}

export function parseIncidentIoSummary(payload: unknown): ParsedIncidentIoSummary {
  const root = requireRecord(payload, "Incident.io proxy");
  const summary = requireRecord(root.summary, "Incident.io proxy summary");
  const sourceComponents = optionalRecordArray(summary.components);
  if (sourceComponents.length === 0) throw new Error("Incident.io proxy summary contained no components");

  const affectedStatuses = parseAffectedStatuses(summary.affected_components);
  const historyVisibility = parseHistoryVisibility(summary.structure);
  const components = parseStructure(summary.structure, sourceComponents, affectedStatuses);
  const incidents = [
    ...parseIncidentIoNoticeList(summary.ongoing_incidents, "incident", undefined),
    ...parseIncidentIoNoticeList(summary.scheduled_maintenances, "maintenance", undefined),
  ];
  const issueHealth = highestHealth(
    incidents
      .filter((incident) => incident.state !== "resolved" && incident.state !== "scheduled")
      .map((incident) => incident.health),
  );
  const hasIssue = affectedStatuses.size > 0 || issueHealth !== "unknown";

  return {
    reportedHealth: hasIssue
      ? highestHealth([reportedHealth(affectedStatuses), issueHealth === "operational" ? "degraded" : issueHealth])
      : "operational",
    statusText: hasIssue ? "We're currently experiencing issues" : undefined,
    components,
    incidents,
    historyWindowDays: positiveInteger(summary.history_window_days) ?? 90,
    displayUptimeMode: optionalString(summary.display_uptime_mode),
    historyVisibility,
  };
}

function componentImpactsUrl(proxyUrl: string, now: Date, windowDays: number): string {
  const end = new Date(now);
  end.setUTCHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - windowDays + 1);
  start.setUTCHours(0, 0, 0, 0);
  const parameters = new URLSearchParams({ start_at: start.toISOString(), end_at: end.toISOString() });
  return `${proxyUrl}/component_impacts?${parameters.toString()}`;
}

function attachComponentHistory(summary: ParsedIncidentIoSummary, payload: unknown, now: Date): ComponentStatus[] {
  const root = optionalRecord(payload);
  if (!root || !Array.isArray(root.component_impacts) || !Array.isArray(root.component_uptimes)) {
    return summary.components;
  }

  const impacts = optionalRecordArray(root.component_impacts);
  const uptimes = new Map(
    optionalRecordArray(root.component_uptimes)
      .map((entry) => [optionalString(entry.component_id), entry] as const)
      .filter((entry): entry is readonly [string, JsonRecord] => Boolean(entry[0])),
  );

  return summary.components.map((component) => {
    const visibility = summary.historyVisibility.get(component.id);
    if (!visibility?.display) return component;

    const days = historyWindow(summary.historyWindowDays, now);
    for (const impact of impacts) {
      if (optionalString(impact.component_id) !== component.id) continue;
      const startAt = optionalString(impact.start_at);
      const endAt = optionalString(impact.end_at) ?? now;
      const status = optionalString(impact.status);
      if (!startAt || !status) continue;
      applyHistoryRange(days, startAt, endAt, historyLevelFromHealth(mapFlexibleHealth(status)));
    }

    const uptime = uptimes.get(component.id);
    const monitoredSince = optionalString(uptime?.data_available_since) ?? visibility.monitoredSince;
    markBeforeMonitoredSince(days, monitoredSince);
    const showPercentage = summary.displayUptimeMode === "chart_and_percentage";
    const uptimePercent = showPercentage ? finitePercent(uptime?.uptime) : undefined;
    const uptimeText =
      uptimePercent === undefined ? undefined : uptimePercent === 100 ? "100%" : publishedPercentText(uptime?.uptime);
    const history = componentHistory("availability", days, {
      monitoredSince,
      uptimePercent,
      uptimeText,
    });
    return history ? { ...component, history } : component;
  });
}

function parseHistoryVisibility(value: unknown): ReadonlyMap<string, { display: boolean; monitoredSince?: string }> {
  const result = new Map<string, { display: boolean; monitoredSince?: string }>();
  const structure = optionalRecord(value);
  for (const item of optionalRecordArray(structure?.items)) {
    const group = optionalRecord(item.group);
    const candidates = group ? optionalRecordArray(group.components) : [optionalRecord(item.component)].filter(Boolean);
    for (const component of candidates) {
      const id = component ? componentId(component) : undefined;
      if (!id || !component) continue;
      result.set(id, {
        display: component.display_uptime === true,
        monitoredSince: optionalString(component.data_available_since),
      });
    }
  }
  return result;
}

function positiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}

export function parseIncidentIoIncidents(payload: unknown, statusPageUrl: string): Incident[] {
  const root = requireRecord(payload, "Incident.io incident history");
  return parseIncidentIoNoticeList(root.incidents, "incident", statusPageUrl).sort(
    (left, right) => parseTimestamp(right.startedAt) - parseTimestamp(left.startedAt),
  );
}

function parseAffectedStatuses(value: unknown): Map<string, string> {
  const statuses = new Map<string, string>();

  for (const component of optionalRecordArray(value)) {
    const id = optionalString(component.component_id) ?? optionalString(component.id);
    const status = optionalString(component.component_status) ?? optionalString(component.status);
    if (id && status) statuses.set(id, status);
  }

  return statuses;
}

function parseStructure(
  value: unknown,
  sourceComponents: readonly JsonRecord[],
  affectedStatuses: ReadonlyMap<string, string>,
): ComponentStatus[] {
  const structure = optionalRecord(value);
  if (!structure) {
    return sourceComponents
      .map((component) => parseComponent(component, affectedStatuses))
      .filter((component): component is ComponentStatus => component !== undefined);
  }

  const items = optionalRecordArray(structure.items);
  const components: ComponentStatus[] = [];

  for (const item of items) {
    const group = optionalRecord(item.group);
    if (group) {
      const groupName = optionalString(group.name);
      for (const component of optionalRecordArray(group.components)) {
        if (group.hidden === true || !groupName) continue;

        const parsed = parseComponent(component, affectedStatuses, groupName);
        if (parsed) components.push(parsed);
      }
      continue;
    }

    const component = optionalRecord(item.component);
    if (!component) continue;

    const parsed = parseComponent(component, affectedStatuses);
    if (parsed) components.push(parsed);
  }

  return components;
}

function parseComponent(
  component: JsonRecord,
  affectedStatuses: ReadonlyMap<string, string>,
  group?: string,
): ComponentStatus | undefined {
  if (component.hidden === true) return undefined;

  const id = componentId(component);
  const name = optionalString(component.name);
  if (!id || !name) return undefined;

  const statusText = affectedStatuses.get(id);
  return {
    id,
    name,
    group,
    health: statusText ? mapFlexibleHealth(statusText) : "operational",
    statusText,
  };
}

function componentId(component: JsonRecord): string | undefined {
  return optionalString(component.component_id) ?? optionalString(component.id);
}

function reportedHealth(affectedStatuses: ReadonlyMap<string, string>): Health {
  if (affectedStatuses.size === 0) return "operational";
  return highestHealth([...affectedStatuses.values()].map(mapFlexibleHealth));
}

function parseIncidentIoNoticeList(
  value: unknown,
  fallbackType: "incident" | "maintenance",
  statusPageUrl: string | undefined,
): Incident[] {
  return optionalRecordArray(value)
    .map((notice) => parseIncidentIoNotice(notice, fallbackType, statusPageUrl))
    .filter((incident): incident is Incident => incident !== undefined);
}

function parseIncidentIoNotice(
  notice: JsonRecord,
  fallbackType: "incident" | "maintenance",
  statusPageUrl: string | undefined,
): Incident | undefined {
  const id = optionalString(notice.id);
  const title = optionalString(notice.name);
  if (!id || !title) return undefined;

  const type = optionalString(notice.type) ?? fallbackType;
  const stateText = optionalString(notice.status);
  const updates = optionalRecordArray(notice.updates)
    .map(parseIncidentIoUpdate)
    .filter((update): update is IncidentUpdate => update !== undefined);
  const latestUpdate = updates.at(-1);
  const sourceState = mapIncidentIoState(stateText ?? latestUpdate?.stateText);
  const state = type === "maintenance" && sourceState !== "resolved" ? "scheduled" : sourceState;
  const affectedComponentIds = new Set<string>();
  const currentHealthValues: Health[] = [];
  const peakHealthValues: Health[] = [];

  for (const component of optionalRecordArray(notice.affected_components)) {
    const componentId = optionalString(component.component_id) ?? optionalString(component.id);
    if (componentId) affectedComponentIds.add(componentId);
    const currentStatus = optionalString(component.current_status);
    const peakStatus = optionalString(component.status);
    if (currentStatus) currentHealthValues.push(mapFlexibleHealth(currentStatus));
    if (peakStatus) peakHealthValues.push(mapFlexibleHealth(peakStatus));
  }

  const sourceUpdates = optionalRecordArray(notice.updates);
  for (const update of sourceUpdates) {
    for (const component of optionalRecordArray(update.component_statuses)) {
      const componentId = optionalString(component.component_id) ?? optionalString(component.id);
      if (componentId) affectedComponentIds.add(componentId);
      const status = optionalString(component.status);
      if (status) peakHealthValues.push(mapFlexibleHealth(status));
    }
  }

  if (currentHealthValues.length === 0) {
    for (const component of optionalRecordArray(sourceUpdates.at(-1)?.component_statuses)) {
      const status = optionalString(component.status);
      if (status) currentHealthValues.push(mapFlexibleHealth(status));
    }
  }

  for (const summary of optionalRecordArray(notice.status_summaries)) {
    const status = optionalString(summary.worst_component_status);
    if (status) peakHealthValues.push(mapFlexibleHealth(status));
  }

  let health =
    type === "maintenance"
      ? "maintenance"
      : highestHealth(state === "resolved" ? peakHealthValues : currentHealthValues);
  if (state !== "resolved" && state !== "scheduled" && (health === "operational" || health === "unknown")) {
    health = "degraded";
  }

  const startedAt = optionalString(notice.published_at) ?? updates[0]?.createdAt;
  const updatedAt = latestUpdate?.createdAt ?? startedAt;

  return {
    id,
    title,
    health,
    state,
    stateText,
    startedAt,
    updatedAt,
    resolvedAt: state === "resolved" ? updatedAt : undefined,
    affectedComponentIds: [...affectedComponentIds],
    updates,
    url: statusPageUrl
      ? new URL(`incidents/${encodeURIComponent(id)}`, withTrailingSlash(statusPageUrl)).toString()
      : undefined,
  };
}

function parseIncidentIoUpdate(update: JsonRecord): IncidentUpdate | undefined {
  const id = optionalString(update.id);
  const body = optionalString(update.message_string) ?? optionalString(optionalRecord(update.message)?.markdown);
  const createdAt = optionalString(update.published_at);
  if (!id || !body || !createdAt) return undefined;

  const stateText = optionalString(update.to_status);
  return {
    id,
    body: body.trim(),
    createdAt,
    state: mapIncidentIoState(stateText),
    stateText,
  };
}

function mapIncidentIoState(value: string | undefined): Incident["state"] {
  switch (value) {
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
    case "maintenance_scheduled":
    case "in_progress":
      return "scheduled";
    default:
      return "unknown";
  }
}
