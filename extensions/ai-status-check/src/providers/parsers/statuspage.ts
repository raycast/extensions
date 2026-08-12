import type { ComponentStatus, Health, Incident, IncidentState, IncidentUpdate } from "../../domain/types";
import { parseTimestamp } from "../../utils/dates";
import { normalizeStatusToken } from "../../utils/status-token";
import { withTrailingSlash } from "../../utils/url";
import { optionalRecordArray, optionalString, requireRecord, type JsonRecord } from "../utils/runtime-values";
import { mapFlexibleHealth } from "../utils/status-normalization";

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
