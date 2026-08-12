import { highestHealth } from "../../domain/derive-health";
import type { ComponentStatus, Health, Incident, IncidentUpdate } from "../../domain/types";
import { parseTimestamp } from "../../utils/dates";
import { withTrailingSlash } from "../../utils/url";
import {
  optionalRecord,
  optionalRecordArray,
  optionalString,
  requireRecord,
  type JsonRecord,
} from "../utils/runtime-values";
import { mapFlexibleHealth } from "../utils/status-normalization";

export interface ParsedIncidentIoSummary {
  reportedHealth: Health;
  statusText?: string;
  components: ComponentStatus[];
  incidents: Incident[];
}

export function parseIncidentIoSummary(payload: unknown): ParsedIncidentIoSummary {
  const root = requireRecord(payload, "Incident.io proxy");
  const summary = requireRecord(root.summary, "Incident.io proxy summary");
  const sourceComponents = optionalRecordArray(summary.components);
  if (sourceComponents.length === 0) throw new Error("Incident.io proxy summary contained no components");

  const affectedStatuses = parseAffectedStatuses(summary.affected_components);
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
  };
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
    case "in_progress":
      return "scheduled";
    default:
      return "unknown";
  }
}
