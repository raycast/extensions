import { deriveProviderHealth, highestHealth } from "../../domain/derive-health";
import type { ComponentStatus, Health, Incident, IncidentState, IncidentUpdate } from "../../domain/types";
import { parseTimestamp } from "../../utils/dates";
import { applyHistoryRange, componentHistory, historyLevelFromHealth, historyWindow } from "../utils/component-history";
import { fetchJson, fetchText, type FetchJson, type FetchText } from "../utils/http";
import type { ProviderAdapter, ProviderAdapterConfig } from "../types";

const COMPONENTS = [
  { id: "1", name: "API" },
  { id: "2", name: "Multimodal Live API" },
  { id: "3", name: "Google AI Studio" },
] as const;

export interface GeminiAdapterConfig extends ProviderAdapterConfig {
  rpcPath?: string;
  requestInit?: RequestInit;
  fetchText?: FetchText;
  fetchJson?: FetchJson;
}

export function createGeminiAdapter(config: GeminiAdapterConfig): ProviderAdapter {
  const requestPage = config.fetchText ?? fetchText;
  const requestRpc = config.fetchJson ?? fetchJson;
  const now = config.now ?? (() => new Date());

  return {
    async fetch(signal) {
      const page = await requestPage(config.statusPageUrl, signal);
      const { apiKey, rpcBase } = parseGeminiBootConfig(page);
      const payload = await requestRpc(
        `${rpcBase}${config.rpcPath ?? "/$rpc/google.internal.alkali.applications.makersuite.v1.MakerSuiteService/ListIncidentsHistory"}`,
        signal,
        {
          ...config.requestInit,
          method: "POST",
          headers: {
            "Content-Type": "application/json+protobuf",
            "X-Goog-Api-Key": apiKey,
            "X-User-Agent": "grpc-web-javascript/0.1",
            Origin: "https://aistudio.google.com",
            Referer: "https://aistudio.google.com/",
            ...config.requestInit?.headers,
          },
          body: config.requestInit?.body ?? "[]",
        },
      );
      const incidents = parseGeminiIncidents(payload, config.statusPageUrl);
      const fetchedAt = now();
      const components = geminiComponents(incidents, fetchedAt);
      const reportedHealth: Health = incidents.some((incident) => incident.state !== "resolved")
        ? "unknown"
        : "operational";

      return {
        providerId: config.providerId,
        health: deriveProviderHealth(reportedHealth, components, incidents),
        components,
        incidents,
        fetchedAt: fetchedAt.toISOString(),
      };
    },
  };
}

export function parseGeminiBootConfig(html: string): { apiKey: string; rpcBase: string } {
  const apiKey = /"WIu0Nc":"([^"]+)"/.exec(html)?.[1];
  const rpcBase = /"CoJqbf":"([^"]+)"/.exec(html)?.[1];
  if (!apiKey || !rpcBase) throw new Error("Gemini status page boot configuration was missing");
  return { apiKey, rpcBase };
}

export function parseGeminiIncidents(payload: unknown, statusPageUrl: string): Incident[] {
  const records = findIncidentRecords(payload);
  if (!records) throw new Error("Gemini status response was malformed");

  return records
    .map((record) => parseIncident(record, statusPageUrl))
    .filter((incident): incident is Incident => incident !== undefined)
    .sort((left, right) => parseTimestamp(right.startedAt) - parseTimestamp(left.startedAt));
}

export function geminiComponents(incidents: readonly Incident[], now = new Date()): ComponentStatus[] {
  return COMPONENTS.map((component) => {
    const active = incidents.filter(
      (incident) => incident.state !== "resolved" && incident.affectedComponentIds.includes(component.id),
    );
    const days = historyWindow(90, now);
    for (const incident of incidents) {
      if (!incident.affectedComponentIds.includes(component.id) || !incident.startedAt) continue;
      applyHistoryRange(
        days,
        incident.startedAt,
        incident.state === "resolved" ? (incident.resolvedAt ?? incident.updatedAt ?? now) : now,
        historyLevelFromHealth(incident.health),
      );
    }
    return {
      ...component,
      health: highestHealth(["operational", ...active.map((incident) => incident.health)]),
      history: componentHistory("incidents", days),
    };
  });
}

function parseIncident(record: readonly unknown[], statusPageUrl: string): Incident | undefined {
  const id = typeof record[0] === "string" ? record[0] : undefined;
  const title = typeof record[1] === "string" ? record[1] : undefined;
  const updateRecords = Array.isArray(record[3]) ? record[3] : [];
  if (!id || !title) return undefined;

  const updates = updateRecords
    .map((value, index) => (Array.isArray(value) ? parseUpdate(id, value, index) : undefined))
    .filter((update): update is IncidentUpdate => update !== undefined);
  const state = updates.at(-1)?.state ?? "unknown";
  const affectedCodes = Array.isArray(record[5]) ? record[5] : [];
  const affectedComponentIds = affectedCodes
    .map((value) => (typeof value === "number" || typeof value === "string" ? String(value) : undefined))
    .filter((value): value is string => Boolean(value));
  const severity = geminiSeverity(typeof record[2] === "number" ? record[2] : undefined);

  return {
    id,
    title,
    state,
    stateText: updates.at(-1)?.stateText,
    health: severity.health,
    startedAt: updates[0]?.createdAt,
    updatedAt: updates.at(-1)?.createdAt,
    resolvedAt: state === "resolved" ? updates.at(-1)?.createdAt : undefined,
    affectedComponentIds,
    updates,
    url: statusPageUrl,
  };
}

function parseUpdate(incidentId: string, record: readonly unknown[], index: number): IncidentUpdate | undefined {
  const stateCode = typeof record[0] === "number" ? record[0] : undefined;
  const unixContainer = Array.isArray(record[2]) ? record[2] : [];
  const unixValue = unixContainer[0];
  const body = typeof record[3] === "string" ? record[3] : undefined;
  if (stateCode === undefined || !body) return undefined;
  const createdAt =
    unixDate(unixValue) ?? (typeof record[1] === "string" ? new Date(`${record[1]}Z`).toISOString() : undefined);
  if (!createdAt) return undefined;

  const status = geminiUpdateStatus(stateCode);
  return {
    id: `${incidentId}-${index}`,
    body,
    createdAt,
    state: status.state,
    stateText: status.label,
  };
}

// The public RPC is undocumented. These explicit values are verified against the
// labels and severity classes rendered by https://aistudio.google.com/status.
// Unrecognized values deliberately stay unknown instead of inheriting a range fallback.
function geminiUpdateStatus(value: number): { state: IncidentState; label?: string } {
  switch (value) {
    case 1:
      return { state: "investigating", label: "Detected" };
    case 2:
      return { state: "identified", label: "Identified" };
    case 3:
      return { state: "monitoring", label: "Mitigated" };
    case 4:
      return { state: "resolved", label: "Resolved" };
    case 5:
      return { state: "monitoring", label: "Update" };
    default:
      return { state: "unknown" };
  }
}

function geminiSeverity(value: number | undefined): { health: Health } {
  switch (value) {
    case 1:
      return { health: "degraded" };
    case 2:
      return { health: "major_outage" };
    default:
      return { health: "unknown" };
  }
}

function findIncidentRecords(value: unknown): readonly (readonly unknown[])[] | undefined {
  if (!Array.isArray(value)) return undefined;
  if (
    value.length > 0 &&
    value.every((item) => Array.isArray(item) && typeof item[0] === "string" && typeof item[1] === "string")
  ) {
    return value as readonly (readonly unknown[])[];
  }
  for (const item of value) {
    const found = findIncidentRecords(item);
    if (found) return found;
  }
  return undefined;
}

function unixDate(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds) ? new Date(seconds * 1000).toISOString() : undefined;
}
