import { parseDateKey } from "../../utils/dates";
import { assertIncidents } from "../../domain/snapshot-validation";
import { extractBalancedObject } from "../utils/embedded-json";
import { deriveProviderHealth } from "../../domain/derive-health";
import type {
  ComponentHistory,
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
import { mergeIncidents } from "../../domain/incidents";
import { fetchOptionalEnrichment } from "../utils/optional-enrichment";
import {
  optionalRecord,
  optionalRecordArray,
  optionalString,
  requireRecord,
  type JsonRecord,
} from "../utils/runtime-values";
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
      const summaryPayload = await fetchJsonResponse(endpoints.summary, signal);
      const fetchedAt = now();

      const summary = parseSummary(summaryPayload);
      const components = summary.components.filter((component) => config.componentFilter?.(component) ?? true);
      const [history, maintenances, histories] = await Promise.all([
        fetchOptionalEnrichment(signal, async (historySignal) => {
          const payload = requireRecord(
            await fetchJsonResponse(endpoints.incidents, historySignal),
            "incident history",
          );
          if (!Array.isArray(payload.incidents)) throw new Error("Incident history list was missing");
          const incidents = parseIncidents(payload, config.statusPageUrl);
          assertIncidents(incidents);
          return incidents;
        }),
        fetchOptionalEnrichment(signal, async (historySignal) => {
          const payload = requireRecord(
            await fetchJsonResponse(endpoints.maintenances, historySignal),
            "maintenance history",
          );
          if (!Array.isArray(payload.scheduled_maintenances)) throw new Error("Maintenance history list was missing");
          const incidents = parseScheduledMaintenances(payload, config.statusPageUrl);
          assertIncidents(incidents);
          return incidents;
        }),
        fetchComponentHistories(components, signal),
      ]);
      const incidents = mergeIncidents(
        [...(history ?? []), ...(maintenances ?? [])],
        [
          ...parseIncidents(summaryPayload, config.statusPageUrl),
          ...parseScheduledMaintenances(summaryPayload, config.statusPageUrl),
        ],
      ).filter((incident) => config.incidentFilter?.(incident) ?? true);
      const isScopedProvider = Boolean(config.componentFilter || config.incidentFilter);
      if (config.componentFilter && components.length === 0) {
        throw new Error("Status source contained no matching components");
      }
      const health = isScopedProvider ? deriveProviderHealth("unknown", components, incidents) : summary.reportedHealth;

      return {
        providerId: config.providerId,
        health,
        statusText: isScopedProvider ? undefined : summary.statusText,
        components: components.map((component) => {
          return { ...component, ...histories.get(component.id) };
        }),
        incidents,
        incidentHistoryAvailability: history === undefined || maintenances === undefined ? "unavailable" : "available",
        fetchedAt: fetchedAt.toISOString(),
      };
    },
  };

  async function fetchComponentHistories(components: ComponentStatus[], signal: AbortSignal) {
    const histories = new Map<string, Pick<ComponentStatus, "history" | "historyAvailability">>(
      components.map(({ id }) => [id, { historyAvailability: "unavailable" }]),
    );
    const componentIds = new Set(components.map((component) => component.id));
    const retainHistories = (data: StatuspageUptimeData, ids: Iterable<string>) => {
      for (const id of ids) {
        const history = statuspageComponentHistory(data[id]);
        if (history) histories.set(id, { history, historyAvailability: "available" });
      }
    };
    await fetchOptionalEnrichment(signal, async (historySignal) => {
      const html = await fetchTextResponse(config.statusPageUrl, historySignal);
      historySignal.throwIfAborted();
      const inline = parseStatuspageUptimeHtml(html);
      const lazyIds = [
        ...new Set(
          [...html.matchAll(/\bdata-uptime-lazy=["']([a-z0-9-]+)["']/gi)]
            .map((match) => match[1]!)
            .filter((id) => componentIds.has(id)),
        ),
      ];
      for (const id of componentIds) {
        histories.set(id, { historyAvailability: inline[id] || lazyIds.includes(id) ? "unavailable" : "unsupported" });
      }
      retainHistories(inline, componentIds);
      // Match the public page's batch limit; never request unrelated component IDs.
      for (let offset = 0; offset < lazyIds.length; offset += 60) {
        historySignal.throwIfAborted();
        const ids = lazyIds.slice(offset, offset + 60);
        const url = new URL("uptime_showcase", config.statusPageUrl);
        url.searchParams.set("components", ids.join(","));
        const payload = await fetchOptionalEnrichment(historySignal, (batchSignal) =>
          fetchJsonResponse(url.toString(), batchSignal),
        );
        historySignal.throwIfAborted();
        retainHistories(parseStatuspageUptimeShowcase(payload), ids);
      }
    });
    // Keep completed charts if a later batch times out; late work cannot alter the returned snapshot.
    return new Map(histories);
  }
}

type StatuspageUptimeData = Record<string, JsonRecord>;

/** Parse the official day-level availability data embedded by Statuspage. */
export function parseStatuspageUptimeHtml(html: string): StatuspageUptimeData {
  let uptimeData: StatuspageUptimeData = {};
  for (const match of html.matchAll(/window\.uptimeData\s*=\s*\{/g)) {
    const objectText = extractBalancedObject(html, match.index + match[0].length - 1);
    if (!objectText) continue;
    try {
      uptimeData = { ...uptimeData, ...uptimeRecords(JSON.parse(objectText)) };
    } catch {
      /* A malformed optional chart must not hide current status. */
    }
  }
  for (const match of html.matchAll(
    /<span\s+id="uptime-percent-([^"]+)"[^>]*>[\s\S]*?<var\s+data-var="uptime-percent"[^>]*>\s*([\d.]+)\s*<\/var>/gi,
  )) {
    const componentId = match[1];
    const uptimeText = match[2];
    const component = componentId ? optionalRecord(uptimeData[componentId]) : undefined;
    if (component && uptimeText) component.uptimeText = uptimeText;
  }
  return uptimeData;
}

function parseStatuspageUptimeShowcase(payload: unknown): StatuspageUptimeData {
  const root = optionalRecord(payload);
  const timelines = uptimeRecords(root?.timelines);
  for (const value of optionalRecordArray(root?.values)) {
    const id = optionalString(value.component);
    const timeline = id ? optionalRecord(timelines[id]) : undefined;
    if (timeline) timeline.uptimeText = value.ninety;
  }
  return timelines;
}

function uptimeRecords(value: unknown): StatuspageUptimeData {
  return Object.fromEntries(
    Object.entries(optionalRecord(value) ?? {}).flatMap(([id, entry]) => {
      const record = optionalRecord(entry);
      return record ? [[id, { ...record }]] : [];
    }),
  );
}

function statuspageComponentHistory(value: JsonRecord | undefined): ComponentHistory | undefined {
  if (!Array.isArray(value?.days) || value.days.length === 0) return;
  const monitoredSince = sourceDate(optionalRecord(value.component)?.startDate);
  const days: ComponentHistoryDay[] = [];
  for (const raw of value.days) {
    const day = optionalRecord(raw);
    const date = parseDateKey(day?.date);
    if (!date) return;
    const previous = days.at(-1)?.date;
    if (previous && Date.parse(date) - Date.parse(previous) !== 86_400_000) return;
    if (monitoredSince && date < monitoredSince) {
      days.push({ date, level: "not_monitored" });
      continue;
    }
    const outages = optionalRecord(day?.outages);
    if (!outages) return;
    const unfamiliar = Object.entries(outages).some(
      ([key, duration]) =>
        !["m", "p", "d"].includes(key) || typeof duration !== "number" || !Number.isFinite(duration) || duration < 0,
    );
    const downtime = nonNegativeNumber(outages.m) + nonNegativeNumber(outages.p) * 0.3;
    days.push({ date, level: unfamiliar ? "unknown" : statuspageDayLevel(downtime) });
  }
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
  return parseDateKey(date);
}

function nonNegativeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
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
