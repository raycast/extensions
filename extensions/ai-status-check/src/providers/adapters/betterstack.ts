import { deriveProviderHealth, highestHealth } from "../../domain/derive-health";
import type { ComponentStatus, Health, Incident, IncidentUpdate } from "../../domain/types";
import { parseTimestamp } from "../../utils/dates";
import { withoutTrailingSlash } from "../../utils/url";
import { componentHistory, finitePercent, historyLevelFromHealth } from "../utils/component-history";
import { fetchJson, type FetchJson } from "../utils/http";
import {
  optionalRecord,
  optionalRecordArray,
  optionalString,
  requireRecord,
  type JsonRecord,
} from "../utils/runtime-values";
import { mapFlexibleHealth, mapFlexibleIncidentState } from "../utils/status-normalization";
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

export interface ParsedBetterStackStatus {
  reportedHealth: Health;
  statusText?: string;
  components: ComponentStatus[];
  incidents: Incident[];
}

export function parseBetterStack(payload: unknown): ParsedBetterStackStatus {
  const root = requireRecord(payload, "Better Stack status page");
  const data = requireRecord(root.data, "Better Stack status page data");
  const pageAttributes = requireRecord(data.attributes, "Better Stack status page attributes");
  const included = optionalRecordArray(root.included);
  const sections = new Map(
    included
      .filter((item) => item.type === "status_page_section")
      .map((item) => [optionalString(item.id), optionalString(optionalRecord(item.attributes)?.name)] as const)
      .filter((entry): entry is readonly [string, string] => Boolean(entry[0] && entry[1])),
  );
  const components = included
    .filter((item) => item.type === "status_page_resource")
    .map((item) => parseResource(item, sections))
    .filter((component): component is ComponentStatus => component !== undefined);
  const updates = new Map(
    included
      .filter((item) => item.type === "status_update")
      .map((item) => [optionalString(item.id), item] as const)
      .filter((entry): entry is readonly [string, JsonRecord] => Boolean(entry[0])),
  );
  const incidents = included
    .filter((item) => item.type === "status_report")
    .map((item) => parseReport(item, updates))
    .filter((incident): incident is Incident => incident !== undefined)
    .sort((left, right) => parseTimestamp(right.startedAt) - parseTimestamp(left.startedAt));

  const statusText = optionalString(pageAttributes.aggregate_state);
  return {
    reportedHealth: mapFlexibleHealth(statusText),
    statusText,
    components,
    incidents,
  };
}

function parseResource(resource: JsonRecord, sections: ReadonlyMap<string, string>): ComponentStatus | undefined {
  const id = optionalString(resource.id);
  const attributes = optionalRecord(resource.attributes);
  const name = optionalString(attributes?.public_name);
  const statusText = optionalString(attributes?.status);
  if (!id || !name || !statusText) return undefined;

  const sectionId = attributes?.status_page_section_id;
  const historyDays = optionalRecordArray(attributes?.status_history).flatMap((day) => {
    const date = optionalString(day.day)?.slice(0, 10);
    const sourceStatus = optionalString(day.status);
    if (!date || !sourceStatus) return [];
    const level =
      sourceStatus === "not_monitored"
        ? ("not_monitored" as const)
        : sourceStatus === "downtime"
          ? ("major_outage" as const)
          : sourceStatus === "maintenance"
            ? ("maintenance" as const)
            : historyLevelFromHealth(mapFlexibleHealth(sourceStatus));
    return [{ date, level }];
  });
  const measuredAvailability =
    typeof attributes?.availability === "number" ? finitePercent(attributes.availability * 100) : undefined;
  const availability = measuredAvailability === undefined ? undefined : Number(measuredAvailability.toFixed(3));
  const monitoredSince = historyDays.find((day) => day.level !== "not_monitored")?.date;
  const history = componentHistory("availability", historyDays, {
    uptimePercent: availability,
    uptimeText: availability === undefined ? undefined : availability === 100 ? "100%" : `${availability.toFixed(3)}%`,
    monitoredSince,
  });
  return {
    id,
    name,
    health: mapFlexibleHealth(statusText),
    statusText,
    group: typeof sectionId === "number" || typeof sectionId === "string" ? sections.get(String(sectionId)) : undefined,
    ...(history ? { history } : {}),
  };
}

function parseReport(report: JsonRecord, updatesById: ReadonlyMap<string, JsonRecord>): Incident | undefined {
  const id = optionalString(report.id);
  const attributes = optionalRecord(report.attributes);
  const title = optionalString(attributes?.title);
  if (!id || !attributes || !title) return undefined;

  const relationshipUpdates = optionalRecordArray(
    optionalRecord(optionalRecord(report.relationships)?.status_updates)?.data,
  );
  const updates = relationshipUpdates
    .map((relationship) => optionalString(relationship.id))
    .map((updateId) => (updateId ? updatesById.get(updateId) : undefined))
    .map(parseUpdate)
    .filter((update): update is IncidentUpdate => update !== undefined)
    .sort((left, right) => parseTimestamp(left.createdAt) - parseTimestamp(right.createdAt));
  const lastUpdate = updates.at(-1);
  const aggregateState = optionalString(attributes.aggregate_state);
  const reportType = optionalString(attributes.report_type);
  const state =
    aggregateState === "resolved"
      ? "resolved"
      : reportType === "maintenance"
        ? "scheduled"
        : (lastUpdate?.state ?? mapFlexibleIncidentState(aggregateState));
  const affected = optionalRecordArray(attributes.affected_resources);

  return {
    id,
    title,
    state,
    stateText: aggregateState ?? lastUpdate?.stateText ?? (reportType === "maintenance" ? reportType : undefined),
    health: state === "scheduled" ? "maintenance" : highestAffectedHealth(affected),
    startedAt: optionalString(attributes.starts_at),
    resolvedAt: state === "resolved" ? (optionalString(attributes.ends_at) ?? lastUpdate?.createdAt) : undefined,
    updatedAt: lastUpdate?.createdAt,
    affectedComponentIds: affected
      .map((item) => optionalString(item.status_page_resource_id))
      .filter((componentId): componentId is string => Boolean(componentId)),
    updates,
  };
}

function parseUpdate(update: JsonRecord | undefined): IncidentUpdate | undefined {
  if (!update) return undefined;
  const id = optionalString(update.id);
  const attributes = optionalRecord(update.attributes);
  const body = optionalString(attributes?.message);
  const createdAt = optionalString(attributes?.published_at);
  if (!id || !body || !createdAt) return undefined;
  const updateHealth = highestAffectedHealth(optionalRecordArray(attributes?.affected_resources));
  const stateText = optionalString(attributes?.status);

  return {
    id,
    body,
    createdAt,
    state: updateHealth === "operational" ? "resolved" : mapFlexibleIncidentState(stateText),
    stateText,
  };
}

function highestAffectedHealth(affected: readonly JsonRecord[]): Health {
  const health = highestHealth(affected.map((item) => mapFlexibleHealth(optionalString(item.status))));
  return health === "unknown" ? "degraded" : health;
}
