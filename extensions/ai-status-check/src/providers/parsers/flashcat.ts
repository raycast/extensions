import { highestHealth } from "../../domain/derive-health";
import type { ComponentStatus, Health, Incident, IncidentState, IncidentUpdate } from "../../domain/types";
import { parseTimestamp } from "../../utils/dates";
import { withoutTrailingSlash } from "../../utils/url";
import { optionalRecordArray, optionalString, requireRecord, type JsonRecord } from "../utils/runtime-values";
import { mapFlexibleHealth, mapFlexibleIncidentState } from "../utils/status-normalization";

export function parseFlashcatStatus(
  currentPayload: unknown,
  historyPayload: unknown,
  statusPageUrl: string,
): { reportedHealth: Health; components: ComponentStatus[]; incidents: Incident[] } {
  const currentRoot = requireRecord(currentPayload, "Flashcat current response");
  const current = requireRecord(currentRoot.data, "Flashcat current status");
  const historyRoot = requireRecord(historyPayload, "Flashcat history response");
  const history = requireRecord(historyRoot.data, "Flashcat incident history");
  const page = requireRecord(current.page, "Flashcat status page");
  const sections = new Map(
    optionalRecordArray(page.sections)
      .map((section) => [optionalString(section.section_id), optionalString(section.name)] as const)
      .filter((entry): entry is readonly [string, string] => Boolean(entry[0] && entry[1])),
  );
  const activeChanges = optionalRecordArray(current.active_changes);
  const currentStatuses = activeComponentStatuses(activeChanges);
  const components = optionalRecordArray(page.components)
    .map((component) => parseComponent(component, sections, currentStatuses))
    .filter((component): component is ComponentStatus => component !== undefined);
  if (components.length === 0) throw new Error("Flashcat status page contained no components");

  const incidents = [
    ...new Map(
      [...optionalRecordArray(history.items), ...activeChanges]
        .map((change) => parseChange(change, statusPageUrl))
        .filter((incident): incident is Incident => incident !== undefined)
        .map((incident) => [incident.id, incident]),
    ).values(),
  ].sort((left, right) => parseTimestamp(right.startedAt) - parseTimestamp(left.startedAt));

  return {
    reportedHealth: activeChanges.length === 0 ? "operational" : "unknown",
    components,
    incidents,
  };
}

interface ActiveComponentStatus {
  health: Health;
  statusText: string;
}

function parseComponent(
  component: JsonRecord,
  sections: ReadonlyMap<string, string>,
  currentStatuses: ReadonlyMap<string, ActiveComponentStatus>,
): ComponentStatus | undefined {
  const id = optionalString(component.component_id);
  const name = optionalString(component.name);
  if (!id || !name) return undefined;
  const currentStatus = currentStatuses.get(id);
  const sectionId = optionalString(component.section_id);
  return {
    id,
    name,
    group: sectionId ? sections.get(sectionId) : undefined,
    health: currentStatus?.health ?? "operational",
    statusText: currentStatus?.statusText,
  };
}

function activeComponentStatuses(changes: readonly JsonRecord[]): Map<string, ActiveComponentStatus> {
  const result = new Map<string, ActiveComponentStatus>();
  for (const change of changes) {
    for (const affected of optionalRecordArray(change.affected_components)) {
      setHigher(result, optionalString(affected.component_id), optionalString(affected.status));
    }
    for (const update of optionalRecordArray(change.updates)) {
      for (const componentChange of optionalRecordArray(update.component_changes)) {
        setHigher(result, optionalString(componentChange.component_id), optionalString(componentChange.status));
      }
    }
  }
  return result;
}

function parseChange(change: JsonRecord, statusPageUrl: string): Incident | undefined {
  const idValue = change.change_id;
  const id = typeof idValue === "number" || typeof idValue === "string" ? String(idValue) : undefined;
  const title = optionalString(change.title);
  if (!id || !title) return undefined;
  const updates = optionalRecordArray(change.updates)
    .map((update, index) => parseUpdate(id, update, index))
    .filter((update): update is IncidentUpdate => update !== undefined);
  const type = optionalString(change.type);
  const stateText = optionalString(change.status);
  const closedAt = secondsIso(change.close_at_seconds);
  const state = changeState(stateText, type, closedAt, updates.at(-1)?.state);
  const affected = optionalRecordArray(change.affected_components);
  const allHealth = [
    ...affected.map((component) => mapFlexibleHealth(optionalString(component.status))),
    ...optionalRecordArray(change.updates).flatMap((update) =>
      optionalRecordArray(update.component_changes).map((component) =>
        mapFlexibleHealth(optionalString(component.status)),
      ),
    ),
  ];
  const peakHealth = highestHealth(allHealth);

  return {
    id,
    title,
    state,
    stateText: stateText ?? updates.at(-1)?.stateText,
    health:
      type === "maintenance"
        ? "maintenance"
        : peakHealth === "unknown" || peakHealth === "operational"
          ? "degraded"
          : peakHealth,
    startedAt: secondsIso(change.start_at_seconds) ?? updates[0]?.createdAt,
    updatedAt: updates.at(-1)?.createdAt,
    resolvedAt: state === "resolved" ? (closedAt ?? updates.at(-1)?.createdAt) : undefined,
    affectedComponentIds: affected
      .map((component) => optionalString(component.component_id))
      .filter((componentId): componentId is string => Boolean(componentId)),
    updates,
    url: `${withoutTrailingSlash(statusPageUrl)}/incidents/${encodeURIComponent(id)}`,
  };
}

function parseUpdate(changeId: string, update: JsonRecord, index: number): IncidentUpdate | undefined {
  const body = optionalString(update.description);
  const createdAt = secondsIso(update.at_seconds);
  if (!body || !createdAt) return undefined;
  const updateId = optionalString(update.update_id) ?? `${changeId}-${index}`;
  const stateText = optionalString(update.status);
  return { id: updateId, body, createdAt, state: mapFlexibleIncidentState(stateText), stateText };
}

function changeState(
  statusText: string | undefined,
  type: string | undefined,
  closedAt: string | undefined,
  latestState: IncidentState | undefined,
): IncidentState {
  const mapped = mapFlexibleIncidentState(statusText);
  if (mapped !== "unknown") return mapped;
  if (closedAt) return "resolved";
  if (type === "maintenance") return "scheduled";
  return latestState === "unknown" || latestState === undefined ? "investigating" : latestState;
}

function secondsIso(value: unknown): string | undefined {
  const seconds = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(seconds) ? new Date(seconds * 1000).toISOString() : undefined;
}

function setHigher(
  target: Map<string, ActiveComponentStatus>,
  id: string | undefined,
  statusText: string | undefined,
): void {
  const health = mapFlexibleHealth(statusText);
  if (!id || !statusText || health === "unknown" || health === "operational") return;
  const current = target.get(id);
  if (!current || highestHealth([current.health, health]) === health) target.set(id, { health, statusText });
}
