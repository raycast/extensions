import type {
  ComponentStatus,
  DayStatus,
  StatusAdapter,
  StatusIncident,
  StatusIndicator,
  StatusSnapshot,
} from "@/types";
import { getOrigin, normalizeSiteUrl } from "@/lib/url";
import { overallDescription } from "@/lib/snapshot-text";
import { buildPageHistoryFromComponents } from "@/lib/uptime-chart";
import { RssFeed, RssFeedItem } from "@/types/rss";

/**
 * Generic RSS fallback for status pages that block their JSON APIs but keep
 * an RSS feed reachable (e.g. status.x.ai behind Cloudflare). Incident-only:
 * the feed lists notices, so components are derived from incident titles and
 * uptime is approximated from incident days.
 */
const FEED_PATHS = ["feed.xml", "rss.xml", "history.rss", "feed", "rss"];

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function stripCdata(text: string): string {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

function tagContent(xml: string, tag: string): string | undefined {
  const match = xml.match(
    new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"),
  );
  return match ? stripCdata(match[1]).trim() : undefined;
}

function toIso(date: string | undefined): string | undefined {
  if (!date) {
    return undefined;
  }
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function parseItem(itemXml: string): RssFeedItem | null {
  const rawTitle = tagContent(itemXml, "title");
  if (!rawTitle) {
    return null;
  }

  const title = decodeEntities(rawTitle.replace(/\s+/g, " ").trim());
  const serviceMatch = title.match(/^\[(.+?)\]\s*(.*)$/);

  const description = tagContent(itemXml, "description") ?? "";
  const status = description.match(/Status:\s*([A-Za-z_ -]+)</)?.[1]?.trim();
  const resolvedAt = description.match(/Resolved:\s*([^<]+)</)?.[1]?.trim();

  // Update blocks follow "<p><strong>{date}</strong></p><h3>{status}</h3><p>{message}</p>";
  // the newest update comes first.
  const update = description.match(
    /<p><strong>([^<]+)<\/strong><\/p>\s*<h3>[^<]*<\/h3>\s*<p>([\s\S]*?)<\/p>/,
  );

  return {
    service: serviceMatch?.[1],
    title: serviceMatch?.[2] || title,
    guid: tagContent(itemXml, "guid"),
    pubDate: toIso(tagContent(itemXml, "pubDate")),
    status,
    resolvedAt: toIso(resolvedAt),
    latestUpdateAt: toIso(update?.[1]),
    latestUpdate: update
      ? decodeEntities(update[2].replace(/<[^>]+>/g, " ").trim())
      : undefined,
  };
}

function parseFeed(xml: string): RssFeed | null {
  if (!/<rss[\s>]/i.test(xml)) {
    return null;
  }

  const channel = xml.match(/<channel(?:\s[^>]*)?>([\s\S]*?)<\/channel>/i)?.[1];
  if (!channel) {
    return null;
  }

  const header = channel.slice(0, channel.indexOf("<item") + 1 || undefined);
  const title = tagContent(header, "title");
  if (!title) {
    return null;
  }

  const items = [...channel.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)]
    .map((match) => parseItem(match[1]))
    .filter((item): item is RssFeedItem => item !== null);

  return {
    title: decodeEntities(title),
    link: tagContent(header, "link"),
    items,
  };
}

async function fetchFeed(siteUrl: string): Promise<RssFeed | null> {
  const normalized = normalizeSiteUrl(siteUrl);
  const origin = getOrigin(normalized);

  const candidates = /\.(xml|rss)$/i.test(normalized)
    ? [normalized]
    : FEED_PATHS.map((path) => `${origin}/${path}`);

  for (const url of candidates) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/rss+xml, application/xml, text/xml" },
      });
      if (!response.ok) {
        continue;
      }

      const feed = parseFeed(await response.text());
      if (feed) {
        return feed;
      }
    } catch {
      // Try the next candidate path.
    }
  }

  return null;
}

function isResolved(item: RssFeedItem): boolean {
  if (item.status) {
    return item.status.toUpperCase() === "RESOLVED";
  }
  return Boolean(item.resolvedAt);
}

function markDays(
  dayMap: Map<string, DayStatus["level"]>,
  from: string | undefined,
  to: string | undefined,
): void {
  if (!from) {
    return;
  }

  const today = new Date();
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const endDay = new Date(to ?? today);
  endDay.setHours(0, 0, 0, 0);

  while (cursor <= endDay) {
    const key = cursor.toISOString().slice(0, 10);
    if (dayMap.has(key)) {
      dayMap.set(key, "degraded");
    }
    cursor.setDate(cursor.getDate() + 1);
  }
}

function emptyDayMap(days = 90): Map<string, DayStatus["level"]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayMap = new Map<string, DayStatus["level"]>();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (days - 1 - i));
    dayMap.set(d.toISOString().slice(0, 10), "operational");
  }
  return dayMap;
}

function toHistory(dayMap: Map<string, DayStatus["level"]>): DayStatus[] {
  return Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, level]) => ({ date, level }));
}

function buildComponents(items: RssFeedItem[]): ComponentStatus[] {
  const services = new Map<string, RssFeedItem[]>();
  for (const item of items) {
    if (!item.service) {
      continue;
    }
    services.set(item.service, [...(services.get(item.service) ?? []), item]);
  }

  return Array.from(services.entries())
    .map(([name, serviceItems]) => {
      const dayMap = emptyDayMap();
      for (const item of serviceItems) {
        // Resolved items without an explicit end date only affect their start
        // day; open-ended ranges are reserved for ongoing incidents.
        const end =
          item.resolvedAt ?? (isResolved(item) ? item.pubDate : undefined);
        markDays(dayMap, item.pubDate, end);
      }

      const hasActive = serviceItems.some((item) => !isResolved(item));

      return {
        id: name,
        name,
        status: hasActive ? "degraded_performance" : "operational",
        historyDays: toHistory(dayMap),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function mapIncidents(items: RssFeedItem[]): StatusIncident[] {
  return items
    .filter((item) => !isResolved(item))
    .map((item, index) => ({
      id: item.guid ?? `rss-${index}`,
      name: item.service ? `[${item.service}] ${item.title}` : item.title,
      status: (item.status ?? "investigating").toLowerCase(),
      impact: "minor",
      updatedAt:
        item.latestUpdateAt ?? item.pubDate ?? new Date().toISOString(),
      body: item.latestUpdate,
      affectedComponentIds: item.service ? [item.service] : undefined,
    }));
}

export const rssAdapter: StatusAdapter = {
  async detect(siteUrl: string): Promise<boolean> {
    try {
      return (await fetchFeed(siteUrl)) !== null;
    } catch {
      return false;
    }
  },

  async fetchSnapshot(siteUrl: string): Promise<StatusSnapshot> {
    const normalized = normalizeSiteUrl(siteUrl);
    const fetchedAt = new Date().toISOString();

    try {
      const feed = await fetchFeed(normalized);
      if (!feed) {
        throw new Error("No RSS status feed found");
      }

      const components = buildComponents(feed.items);
      const incidents = mapIncidents(feed.items);
      const indicator: StatusIndicator =
        incidents.length > 0 ? "minor" : "none";

      return {
        pageName:
          feed.title.replace(/\s*(System\s+)?Status\s*$/i, "") || feed.title,
        pageUrl: feed.link ?? getOrigin(normalized),
        overallDescription: overallDescription(indicator, incidents.length),
        indicator,
        components,
        incidents,
        historyDays: buildPageHistoryFromComponents(components),
        fetchedAt,
      };
    } catch (error) {
      return {
        pageName: new URL(normalized).hostname,
        pageUrl: normalized,
        overallDescription: "Failed to fetch",
        indicator: "none",
        components: [],
        incidents: [],
        fetchedAt,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};
