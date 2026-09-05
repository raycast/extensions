import { deriveProviderHealth } from "../../domain/derive-health";
import type { ComponentStatus, Health, Incident, IncidentUpdate } from "../../domain/types";
import { parseTimestamp } from "../../utils/dates";
import { normalizeStatusToken } from "../../utils/status-token";
import type { ProviderAdapter, ProviderAdapterConfig } from "../types";
import { fetchText, type FetchText } from "../utils/http";
import { parseRssItems, stripHtml, type RssItem } from "../utils/rss";
import { mapFlexibleIncidentState, statusComponentId } from "../utils/status-normalization";

export interface ParsedStatusPage {
  reportedHealth: Health;
  statusText?: string;
  components: ComponentStatus[];
}

export interface PageAndFeedAdapterConfig extends ProviderAdapterConfig {
  pageUrl?: string;
  feedUrl: string;
  parsePage: (html: string, now?: Date) => ParsedStatusPage;
  parseFeed?: (xml: string) => Incident[];
  fetchText?: FetchText;
}

export function createPageAndFeedAdapter(config: PageAndFeedAdapterConfig): ProviderAdapter {
  const request = config.fetchText ?? fetchText;
  const now = config.now ?? (() => new Date());

  return {
    async fetch(signal) {
      const fetchedAt = now();
      const [page, feed] = await Promise.all([
        request(config.pageUrl ?? config.statusPageUrl, signal).then((html) => config.parsePage(html, fetchedAt)),
        request(config.feedUrl, signal),
      ]);
      const incidents = (config.parseFeed ?? parseIncidentRss)(feed);
      const components = page.components;
      if (components.length === 0) throw new Error("Status adapter contained no components");
      const pageHealth = page.reportedHealth;
      const reportedHealth =
        pageHealth === "unknown" && incidents.every((incident) => incident.state === "resolved")
          ? "operational"
          : pageHealth;

      return {
        providerId: config.providerId,
        health: deriveProviderHealth(reportedHealth, components, incidents),
        statusText: page.statusText,
        components,
        incidents,
        fetchedAt: fetchedAt.toISOString(),
      };
    },
  };
}

export function parseIncidentRss(xml: string): Incident[] {
  const grouped = new Map<string, RssItem[]>();
  for (const item of parseRssItems(xml)) {
    const id = rssIncidentId(item);
    const existing = grouped.get(id) ?? [];
    existing.push(item);
    grouped.set(id, existing);
  }

  return [...grouped.entries()]
    .map(([id, items]) => parseIncidentGroup(id, items))
    .sort((left, right) => parseTimestamp(right.startedAt) - parseTimestamp(left.startedAt));
}

function parseIncidentGroup(id: string, items: RssItem[]): Incident {
  const sorted = [...items].sort((left, right) => parseTimestamp(left.publishedAt) - parseTimestamp(right.publishedAt));
  const latest = sorted.at(-1) ?? items[0];
  const updates = sorted
    .flatMap((item, index) => {
      const embedded = parseEmbeddedRssUpdates(id, item);
      return embedded.length > 0 ? embedded : [parseRssUpdate(id, item, index)];
    })
    .filter((update): update is IncidentUpdate => update !== undefined);
  updates.sort((left, right) => parseTimestamp(left.createdAt) - parseTimestamp(right.createdAt));
  const publishedStatus = rssItemStatus(latest);
  const latestUpdate = updates.at(-1);
  const state = publishedStatus?.state !== "unknown" ? publishedStatus.state : (latestUpdate?.state ?? "unknown");
  const stateText = publishedStatus?.state !== "unknown" ? publishedStatus.stateText : latestUpdate?.stateText;
  const affectedNames = new Set<string>();
  for (const item of items) {
    const bracketed = /^\[([^\]]+)\]/.exec(item.title)?.[1];
    if (bracketed) affectedNames.add(bracketed);
    for (const match of (item.description ?? "").matchAll(/<li>([\s\S]*?)<\/li>/gi)) {
      const name = stripHtml(match[1] ?? "");
      if (name) affectedNames.add(name);
    }
  }
  const title = latest.title.replace(/^\[[^\]]+\]\s*/, "");
  const health = incidentHealth(`${title} ${latest.description ?? ""} ${latest.categories.join(" ")}`, state);

  return {
    id,
    title,
    state,
    stateText,
    health,
    startedAt: updates[0]?.createdAt ?? sorted[0]?.publishedAt,
    updatedAt: updates.at(-1)?.createdAt ?? latest.publishedAt,
    resolvedAt: state === "resolved" ? (updates.at(-1)?.createdAt ?? latest.publishedAt) : undefined,
    affectedComponentIds: [...affectedNames].map(statusComponentId),
    updates,
    url: latest.link,
  };
}

function parseEmbeddedRssUpdates(incidentId: string, item: RssItem): IncidentUpdate[] {
  const description = item.description ?? "";
  if (!/Updates:/i.test(description)) return [];

  return [...description.matchAll(/<div>([\s\S]*?)<\/div>/gi)]
    .map((match, index): IncidentUpdate | undefined => {
      const block = match[1] ?? "";
      const createdAtText = /<strong>([\s\S]*?)<\/strong>/i.exec(block)?.[1];
      const stateText = /<h3>([\s\S]*?)<\/h3>/i.exec(block)?.[1];
      const bodies = [...block.matchAll(/<p>([\s\S]*?)<\/p>/gi)];
      const body = stripHtml(bodies.at(-1)?.[1] ?? "");
      const parsedTime = Date.parse(stripHtml(createdAtText ?? ""));
      if (!Number.isFinite(parsedTime) || !stateText || !body) return undefined;

      const cleanState = stripHtml(stateText);
      return {
        id: `${incidentId}-embedded-${index}`,
        body,
        createdAt: new Date(parsedTime).toISOString(),
        state: mapFlexibleIncidentState(cleanState),
        stateText: cleanState,
      };
    })
    .filter((update): update is IncidentUpdate => update !== undefined);
}

function parseRssUpdate(incidentId: string, item: RssItem, index: number): IncidentUpdate | undefined {
  if (!item.publishedAt) return undefined;

  const description = item.description ?? "";
  const status = rssItemStatus(item);
  const body = stripHtml(description)
    .replace(/^Status:\s*[^\n]+\n?/i, "")
    .replace(/^Severity:\s*[^\n]+\n?/i, "")
    .replace(/^Resolved:\s*[^\n]+\n?/i, "")
    .replace(/Affected services[\s\S]*$/i, "")
    .trim();
  return {
    id: `${incidentId}-${index}`,
    body: body || item.title,
    createdAt: item.publishedAt,
    state: status.state,
    stateText: status.stateText,
  };
}

function rssItemStatus(item: RssItem): { state: Incident["state"]; stateText?: string } {
  const description = item.description ?? "";
  const sourceState =
    /Status:\s*([^<\n]+)/i.exec(description)?.[1]?.trim() ??
    /<strong>([^<]+)<\/strong>/i.exec(description)?.[1]?.trim();
  const candidates = [sourceState, ...item.categories.toReversed()].filter((value): value is string => Boolean(value));

  for (const stateText of candidates) {
    const state = mapFlexibleIncidentState(stateText);
    if (state !== "unknown") return { state, stateText };
  }

  return { state: "unknown", stateText: candidates[0] };
}

function rssIncidentId(item: RssItem): string {
  const value = item.guid ?? item.link ?? `${item.title}-${item.publishedAt ?? ""}`;
  return value.split("/").filter(Boolean).at(-1) ?? value;
}

function incidentHealth(value: string, state: Incident["state"]): Health {
  if (state === "scheduled") return "maintenance";
  const normalized = normalizeStatusToken(stripHtml(value));
  if (/major_outage|full_outage|unavailable|(^|_)outage($|_)/.test(normalized)) return "major_outage";
  if (/partial_outage/.test(normalized)) return "partial_outage";
  if (/maintenance/.test(normalized)) return "maintenance";
  return "degraded";
}
