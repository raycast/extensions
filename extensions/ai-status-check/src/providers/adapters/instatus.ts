import { deriveProviderHealth } from "../../domain/derive-health";
import type { ComponentStatus, Health, Incident, IncidentUpdate } from "../../domain/types";
import { parseTimestamp } from "../../utils/dates";
import { withoutTrailingSlash } from "../../utils/url";
import {
  applyHistoryRange,
  componentHistory,
  finitePercent,
  historyLevelFromHealth,
  historyWindow,
  publishedPercentText,
} from "../utils/component-history";
import { fetchJson, fetchText, type FetchJson, type FetchText } from "../utils/http";
import { fetchOptionalEnrichment } from "../utils/optional-enrichment";
import { parseRssItems, stripHtml } from "../utils/rss";
import { optionalRecord, optionalRecordArray, optionalString, requireRecord } from "../utils/runtime-values";
import { mapFlexibleHealth, mapFlexibleIncidentState } from "../utils/status-normalization";
import type { ProviderAdapter, ProviderAdapterConfig } from "../types";

export interface InstatusAdapterConfig extends ProviderAdapterConfig {
  summaryUrl?: string;
  componentsUrl?: string;
  historyUrl?: string;
  fetchJson?: FetchJson;
  fetchText?: FetchText;
}

export function createInstatusAdapter(config: InstatusAdapterConfig): ProviderAdapter {
  const request = config.fetchJson ?? fetchJson;
  const requestText = config.fetchText ?? fetchText;
  const now = config.now ?? (() => new Date());
  const baseUrl = withoutTrailingSlash(config.statusPageUrl);

  return {
    async fetch(signal) {
      const [summaryPayload, componentsPayload, historyFeed, statusPageHtml] = await Promise.all([
        request(config.summaryUrl ?? `${baseUrl}/v3/summary.json`, signal),
        request(config.componentsUrl ?? `${baseUrl}/v3/components.json`, signal),
        requestText(config.historyUrl ?? `${baseUrl}/history.rss`, signal),
        fetchOptionalEnrichment(signal, (historySignal) => requestText(config.statusPageUrl, historySignal)),
      ]);
      const fetchedAt = now();
      const parsed = parseInstatus(summaryPayload, componentsPayload);
      const histories = parseInstatusComponentHistories(statusPageHtml ?? "", fetchedAt);
      const incidents = parseInstatusHistory(historyFeed, parsed.components);

      return {
        providerId: config.providerId,
        health: deriveProviderHealth(parsed.reportedHealth, parsed.components, incidents),
        statusText: parsed.statusText,
        components: parsed.components.map((component) => {
          const history = histories.get(component.id);
          return history ? { ...component, history } : component;
        }),
        incidents,
        fetchedAt: fetchedAt.toISOString(),
      };
    },
  };
}

export function parseInstatusComponentHistories(html: string, now = new Date()) {
  const payload = decodeNextFlightPayload(html);
  const marker = '"componentsUptime":';
  const markerIndex = payload.indexOf(marker);
  if (markerIndex === -1) return new Map<string, ComponentStatus["history"]>();
  const openIndex = payload.indexOf("{", markerIndex + marker.length);
  const objectText = openIndex === -1 ? undefined : extractBalancedObject(payload, openIndex);
  if (!objectText) return new Map<string, ComponentStatus["history"]>();

  let parsed: unknown;
  try {
    parsed = JSON.parse(objectText);
  } catch {
    return new Map<string, ComponentStatus["history"]>();
  }
  const root = optionalRecord(parsed);
  if (!root) return new Map<string, ComponentStatus["history"]>();

  const result = new Map<string, ComponentStatus["history"]>();
  for (const [componentId, value] of Object.entries(root)) {
    const uptime = optionalRecord(value);
    if (!uptime) continue;
    const days = historyWindow(90, now);
    for (const outage of optionalRecordArray(uptime.outages)) {
      const startAt = optionalString(outage.from);
      const endAt = optionalString(outage.to) ?? now;
      const status = optionalString(outage.status);
      if (!startAt || !status || status === "OPERATIONAL") continue;
      applyHistoryRange(days, startAt, endAt, instatusHistoryLevel(status));
    }
    const history = componentHistory("availability", days, {
      uptimePercent: finitePercent(uptime.uptime),
      uptimeText: publishedPercentText(uptime.uptime),
    });
    if (history) result.set(componentId, history);
  }
  return result;
}

function instatusHistoryLevel(status: string) {
  switch (status.toUpperCase()) {
    case "MAJOROUTAGE":
      return "major_outage" as const;
    case "PARTIALOUTAGE":
    case "MINOROUTAGE":
      return "partial_outage" as const;
    case "UNDERMAINTENANCE":
      return "maintenance" as const;
    case "DEGRADEDPERFORMANCE":
      return "degraded" as const;
    default:
      return historyLevelFromHealth(mapFlexibleHealth(status));
  }
}

function decodeNextFlightPayload(html: string): string {
  let payload = "";
  for (const match of html.matchAll(/self\.__next_f\.push\(\[1,\s*"((?:[^"\\]|\\.)*)"\]\)/g)) {
    try {
      payload += JSON.parse(`"${match[1]}"`) as string;
    } catch {
      // Ignore a malformed chunk while preserving any valid component data.
    }
  }
  return payload;
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

export interface ParsedInstatusSummary {
  reportedHealth: Health;
  statusText: string;
  components: ComponentStatus[];
}

export function parseInstatus(summaryPayload: unknown, componentsPayload: unknown): ParsedInstatusSummary {
  const summary = requireRecord(summaryPayload, "Instatus summary");
  const page = requireRecord(summary.page, "Instatus summary page");
  const statusText = optionalString(page.status);
  if (!statusText) throw new Error("Instatus summary did not contain a status");

  const componentsRoot = requireRecord(componentsPayload, "Instatus components");
  const components = optionalRecordArray(componentsRoot.components)
    .map<ComponentStatus | undefined>((component) => {
      const id = optionalString(component.id);
      const name = optionalString(component.name);
      const status = optionalString(component.status);
      if (!id || !name || !status) return undefined;
      return {
        id,
        name,
        health: mapFlexibleHealth(status),
        statusText: status,
        group:
          optionalString(optionalRecord(component.group)?.name) ??
          optionalString(component.group) ??
          optionalString(optionalRecord(component.parent)?.name),
      } satisfies ComponentStatus;
    })
    .filter((component): component is ComponentStatus => component !== undefined);

  return { reportedHealth: mapFlexibleHealth(statusText), statusText, components };
}

export function parseInstatusHistory(xml: string, components: readonly ComponentStatus[]): Incident[] {
  const componentIds = new Map(components.map((component) => [component.name.toLowerCase(), component.id]));

  return parseRssItems(xml)
    .map((item): Incident | undefined => {
      const id = (item.guid ?? item.link)?.split("/").filter(Boolean).at(-1);
      if (!id || !item.publishedAt) return undefined;

      const description = stripHtml(item.description ?? "");
      const type = /^Type:\s*([^\n]+)/im.exec(description)?.[1]?.trim();
      const affectedNames =
        /Affected Components:\s*(.*?)(?=\s+[A-Z][a-z]{2}\s+\d{1,2},\s+\d{2}:\d{2}:\d{2}\s+GMT|$)/is
          .exec(description)?.[1]
          ?.split(",")
          .map((name) => name.trim())
          .filter(Boolean) ?? [];
      const updates = parseInstatusUpdates(id, description, item.publishedAt).sort(
        (left, right) => parseTimestamp(left.createdAt) - parseTimestamp(right.createdAt),
      );
      const latest = updates.at(-1);
      const state = latest?.state ?? (type?.toLowerCase() === "maintenance" ? "scheduled" : "unknown");
      const isMaintenance = type?.toLowerCase() === "maintenance";

      return {
        id,
        title: item.title,
        health: isMaintenance ? "maintenance" : "degraded",
        state,
        stateText: latest?.stateText,
        startedAt: updates[0]?.createdAt ?? item.publishedAt,
        updatedAt: latest?.createdAt ?? item.publishedAt,
        resolvedAt: state === "resolved" ? latest?.createdAt : undefined,
        affectedComponentIds: affectedNames
          .map((name) => componentIds.get(name.toLowerCase()))
          .filter((componentId): componentId is string => componentId !== undefined),
        updates,
        url: item.link,
      };
    })
    .filter((incident): incident is Incident => incident !== undefined)
    .sort((left, right) => parseTimestamp(right.startedAt) - parseTimestamp(left.startedAt));
}

function parseInstatusUpdates(incidentId: string, description: string, publishedAt: string): IncidentUpdate[] {
  const year = new Date(publishedAt).getUTCFullYear();
  const pattern =
    /\b([A-Z][a-z]{2})\s+(\d{1,2}),\s+(\d{2}:\d{2}:\d{2})\s+GMT([+-]\d+(?::\d+)?)\s+-\s+([^-]+?)\s+-\s+([\s\S]*?)(?=\s+[A-Z][a-z]{2}\s+\d{1,2},\s+\d{2}:\d{2}:\d{2}\s+GMT[+-]\d+(?::\d+)?\s+-|$)/g;
  const updates: IncidentUpdate[] = [];

  for (const [index, match] of [...description.matchAll(pattern)].entries()) {
    const [, month, day, time, offset, stateText, body] = match;
    const parsedTime = Date.parse(`${month} ${day}, ${year} ${time} GMT${offset}`);
    if (!stateText || !body || !Number.isFinite(parsedTime)) continue;
    updates.push({
      id: `${incidentId}-${index}`,
      state: mapFlexibleIncidentState(stateText.trim()),
      stateText: stateText.trim(),
      body: body.trim().replace(/\s+/g, " "),
      createdAt: new Date(parsedTime).toISOString(),
    });
  }

  return updates;
}
