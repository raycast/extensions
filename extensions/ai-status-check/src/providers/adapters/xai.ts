import type { ComponentHistory, ComponentHistoryLevel, ComponentStatus } from "../../domain/types";
import { normalizeStatusToken } from "../../utils/status-token";
import type { ProviderAdapter, ProviderAdapterConfig } from "../types";
import { componentHistory, historyWindow } from "../utils/component-history";
import { fetchText } from "../utils/http";
import { mapFlexibleHealth } from "../utils/status-normalization";
import { createPageAndFeedAdapter, type PageAndFeedAdapterConfig, type ParsedStatusPage } from "./page-and-feed";

export interface XaiAdapterConfig extends ProviderAdapterConfig {
  fetchText?: PageAndFeedAdapterConfig["fetchText"];
}

export function createXaiAdapter(config: XaiAdapterConfig): ProviderAdapter {
  const adapter = createPageAndFeedAdapter({
    ...config,
    pageUrl: "https://status.x.ai/index.txt",
    feedUrl: "https://status.x.ai/feed.xml",
    parsePage: parseXaiStatusPage,
  });
  const request = config.fetchText ?? fetchText;
  return {
    ...adapter,
    async fetchComponentHistory(componentId, signal) {
      const detailUrl = new URL(`${encodeURIComponent(componentId)}.txt`, config.statusPageUrl).toString();
      return parseXaiComponentHistory(await request(detailUrl, signal), config.now?.() ?? new Date());
    },
  };
}

export function parseXaiStatusPage(rsc: string): ParsedStatusPage {
  if (!rsc.includes('"children":"Live service data"')) {
    throw new Error("xAI status page payload was malformed");
  }

  const references = parseReferences(rsc);
  const components: ComponentStatus[] = [];
  const servicePattern =
    /\["\$","\$L[\da-f]+","([^"]+)",\{"href":"\/\1"[\s\S]*?"className":"heading-2","children":"([^"]+)"([\s\S]*?)(?=\["\$","\$L[\da-f]+","[^"\]]+",\{"href":"\/|\n[\da-f]+:|$)/gi;

  for (const match of rsc.matchAll(servicePattern)) {
    const id = match[1];
    const name = match[2];
    const tail = match[3] ?? "";
    if (!id || !name) continue;

    const inlineStatus = [...tail.matchAll(/"children":"([^"]+)"/g)].at(-1)?.[1];
    const referenceId = /"\$L([\da-f]+)"/.exec(tail)?.[1];
    const referencedStatus = referenceId
      ? /"children":"([^"]+)"/.exec(references.get(referenceId) ?? "")?.[1]
      : undefined;
    const statusText = inlineStatus ?? referencedStatus;
    if (!statusText) continue;

    components.push({
      id,
      name,
      health: mapFlexibleHealth(statusText),
      statusText,
      url: `https://status.x.ai/${encodeURIComponent(id)}`,
    });
  }

  if (components.length === 0) throw new Error("xAI status page contained no components");

  const noIncidents = rsc.includes('"children":"No incidents declared"');
  return {
    reportedHealth: noIncidents ? "operational" : "unknown",
    statusText: noIncidents ? "No incidents declared" : undefined,
    components,
  };
}

interface XaiProductIncident {
  status?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  severity?: unknown;
  updates?: Array<{ createTime?: unknown; severity?: unknown }>;
}

export function parseXaiComponentHistory(rsc: string, now = new Date()): ComponentHistory {
  const product = parseProduct(rsc);
  const incidents = Array.isArray(product.incidents) ? (product.incidents as XaiProductIncident[]) : [];
  const days = historyWindow(30, now);

  for (const day of days) {
    const start = new Date(`${day.date}T00:00:00.000Z`);
    const end = new Date(`${day.date}T23:59:59.999Z`);
    const levels = incidents
      .filter((incident) => incidentOverlapsDay(incident, start, end, now))
      .map((incident) => xaiIncidentLevelOnDay(incident, start, end))
      .filter((level): level is ComponentHistoryLevel => level !== undefined);
    day.level = worstXaiLevel(levels);
  }

  const history = componentHistory("incidents", days);
  if (!history) throw new Error("xAI component page contained no history");
  return history;
}

function parseProduct(rsc: string): Record<string, unknown> {
  const marker = '"product":';
  const markerIndex = rsc.indexOf(marker);
  const openIndex = markerIndex === -1 ? -1 : rsc.indexOf("{", markerIndex + marker.length);
  const objectText = openIndex === -1 ? undefined : extractBalancedObject(rsc, openIndex);
  if (!objectText) throw new Error("xAI component page payload was malformed");
  try {
    const value: unknown = JSON.parse(objectText);
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  } catch {
    // Fall through to the source-specific error below.
  }
  throw new Error("xAI component page payload was malformed");
}

function incidentOverlapsDay(incident: XaiProductIncident, start: Date, end: Date, now: Date): boolean {
  const incidentStart = parsedDate(incident.startTime);
  const incidentEnd = parsedDate(incident.endTime) ?? (incident.status === "active" ? now : undefined);
  return Boolean(incidentStart && incidentEnd && incidentStart <= end && incidentEnd >= start);
}

function xaiIncidentLevelOnDay(
  incident: XaiProductIncident,
  start: Date,
  end: Date,
): ComponentHistoryLevel | undefined {
  const updates = Array.isArray(incident.updates) ? incident.updates : [];
  const sameDay = updates.filter((update) => {
    const time = parsedDate(update.createTime);
    return time && time >= start && time <= end;
  });
  if (sameDay.length > 0) return worstXaiLevel(sameDay.map((update) => xaiSeverityLevel(update.severity)));

  const before = updates
    .map((update) => ({ update, time: parsedDate(update.createTime) }))
    .filter((entry): entry is { update: (typeof updates)[number]; time: Date } =>
      Boolean(entry.time && entry.time <= end),
    )
    .sort((left, right) => right.time.getTime() - left.time.getTime())[0];
  if (before) return xaiSeverityLevel(before.update.severity);

  const after = updates
    .map((update) => ({ update, time: parsedDate(update.createTime) }))
    .filter((entry): entry is { update: (typeof updates)[number]; time: Date } =>
      Boolean(entry.time && entry.time > end),
    )
    .sort((left, right) => left.time.getTime() - right.time.getTime())[0];
  return xaiSeverityLevel(after?.update.severity ?? incident.severity);
}

function xaiSeverityLevel(value: unknown): ComponentHistoryLevel {
  switch (value) {
    case "outage":
      return "major_outage";
    case "disruption":
      return "degraded";
    case "info":
      return "informational";
    case "available":
      return "operational";
    default:
      return "unknown";
  }
}

function worstXaiLevel(levels: readonly ComponentHistoryLevel[]): ComponentHistoryLevel {
  const severity: Readonly<Partial<Record<ComponentHistoryLevel, number>>> = {
    operational: 0,
    unknown: 1,
    informational: 2,
    degraded: 3,
    major_outage: 4,
  };
  return levels.reduce<ComponentHistoryLevel>(
    (worst, level) => ((severity[level] ?? 0) > (severity[worst] ?? 0) ? level : worst),
    "operational",
  );
}

function parsedDate(value: unknown): Date | undefined {
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
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

function parseReferences(rsc: string): ReadonlyMap<string, string> {
  const references = new Map<string, string>();

  for (const line of rsc.split("\n")) {
    const match = /^([\da-f]+):(.*)$/i.exec(line);
    if (match?.[1] && match[2]) references.set(normalizeStatusToken(match[1]), match[2]);
  }

  return references;
}
