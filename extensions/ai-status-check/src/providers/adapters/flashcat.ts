import { deriveProviderHealth, highestHealth } from "../../domain/derive-health";
import type { ComponentStatus, Health, Incident, IncidentState, IncidentUpdate } from "../../domain/types";
import { parseTimestamp } from "../../utils/dates";
import { withoutTrailingSlash } from "../../utils/url";
import {
  applyHistoryRange,
  componentHistory,
  finitePercent,
  historyLevelFromHealth,
  historyWindow,
  markBeforeMonitoredSince,
} from "../utils/component-history";
import { fetchJson, type FetchJson } from "../utils/http";
import { fetchOptionalEnrichment } from "../utils/optional-enrichment";
import {
  optionalRecord,
  optionalRecordArray,
  optionalString,
  requireRecord,
  type JsonRecord,
} from "../utils/runtime-values";
import { mapFlexibleHealth, mapFlexibleIncidentState } from "../utils/status-normalization";
import type { ProviderAdapter, ProviderAdapterConfig } from "../types";

export interface FlashcatAdapterConfig extends ProviderAdapterConfig {
  pageId: string;
  apiBaseUrl?: string;
  fetchJson?: FetchJson;
}

export function createFlashcatAdapter(config: FlashcatAdapterConfig): ProviderAdapter {
  const request = config.fetchJson ?? fetchJson;
  const now = config.now ?? (() => new Date());

  return {
    async fetch(signal) {
      const fetchedAt = now();
      const endAt = Math.floor(fetchedAt.getTime() / 1000);
      const startAt = endAt - 90 * 86_400;
      const apiBaseUrl = config.apiBaseUrl ?? "https://statuspage.flashcat.cloud/api/status-page";
      const sourceBase = `${apiBaseUrl.replace(/\/+$/, "")}/${encodeURIComponent(config.pageId)}`;
      const [currentPayload, historyPayload, structurePayload] = await Promise.all([
        request(`${sourceBase}/summary/active`, signal),
        request(`${sourceBase}/change/list?start_at_seconds=${startAt}&end_at_seconds=${endAt}`, signal),
        fetchOptionalEnrichment(signal, (historySignal) =>
          request(
            `${sourceBase}/summary/structure?start_at_from_seconds=${startAt}&start_at_to_seconds=${endAt}`,
            historySignal,
          ),
        ),
      ]);
      const parsed = parseFlashcatStatus(
        currentPayload,
        historyPayload,
        config.statusPageUrl,
        structurePayload,
        fetchedAt,
      );
      const health = deriveProviderHealth(parsed.reportedHealth, parsed.components, parsed.incidents);

      return {
        providerId: config.providerId,
        health,
        components: parsed.components,
        incidents: parsed.incidents,
        fetchedAt: fetchedAt.toISOString(),
      };
    },
  };
}

export function parseFlashcatStatus(
  currentPayload: unknown,
  historyPayload: unknown,
  statusPageUrl: string,
  structurePayload?: unknown,
  now = new Date(),
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
  const histories = parseFlashcatComponentHistories(structurePayload, now);
  const components = optionalRecordArray(page.components)
    .map((component) => parseComponent(component, sections, currentStatuses))
    .filter((component): component is ComponentStatus => component !== undefined)
    .map((component) => {
      const history = histories.get(component.id);
      return history ? { ...component, history } : component;
    });
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

export function parseFlashcatComponentHistories(payload: unknown, now = new Date()) {
  const root = optionalRecord(payload);
  const data = optionalRecord(root?.data);
  if (!data) return new Map<string, ComponentStatus["history"]>();
  const impacts = optionalRecordArray(data.component_impacts);
  const result = new Map<string, ComponentStatus["history"]>();

  for (const uptime of optionalRecordArray(data.component_uptimes)) {
    const componentId = optionalString(uptime.component_id);
    if (!componentId) continue;
    const days = historyWindow(90, now);
    for (const impact of impacts) {
      if (optionalString(impact.component_id) !== componentId) continue;
      const startAt = secondsIso(impact.start_at_seconds);
      const endAt = secondsIso(impact.end_at_seconds) ?? now;
      const status = optionalString(impact.status);
      if (!startAt || !status) continue;
      applyHistoryRange(days, startAt, endAt, historyLevelFromHealth(mapFlexibleHealth(status)));
    }
    const monitoredSince = secondsIso(uptime.available_since_seconds);
    markBeforeMonitoredSince(days, monitoredSince);
    const uptimePercent = finitePercent(uptime.uptime);
    const history = componentHistory("availability", days, {
      monitoredSince,
      uptimePercent,
      uptimeText: uptimePercent === undefined ? undefined : `${uptimePercent.toFixed(2)}%`,
    });
    if (history) result.set(componentId, history);
  }
  return result;
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
