import type {
  AdapterFetchInput,
  ComponentStatus,
  ComponentStatusValue,
  DayStatus,
  StatusAdapter,
  StatusIncident,
  StatusIndicator,
  StatusSnapshot,
} from "@/types";
import { buildDayHistory, type DaySpan, HISTORY_DAYS } from "@/lib/day-history";
import { worstIndicator } from "@/lib/indicator";
import { overallDescription } from "@/lib/snapshot-text";
import {
  averageComponentUptime,
  buildPageHistoryFromComponents,
} from "@/lib/uptime-chart";
import { getOrigin, normalizeSiteUrl } from "@/lib/url";
import type {
  DatadogComponent,
  DatadogComponentStatus,
  DatadogConfig,
  DatadogIncident,
  DatadogTimelineEntry,
} from "@/adapters/datadog/types";

const DATADOG_PAGE_URL = /\.statuspage\.datadoghq\.[a-z]+/;
const DAY_MS = 24 * 60 * 60 * 1000;

function isDatadogConfig(data: unknown): data is DatadogConfig {
  return (
    typeof data === "object" &&
    data !== null &&
    "pageUrl" in data &&
    typeof data.pageUrl === "string" &&
    DATADOG_PAGE_URL.test(data.pageUrl) &&
    "components" in data &&
    Array.isArray(data.components)
  );
}

async function fetchConfig(siteUrl: string): Promise<DatadogConfig | null> {
  const origin = getOrigin(normalizeSiteUrl(siteUrl));
  const response = await fetch(`${origin}/config.json`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data: unknown = await response.json();
  return isDatadogConfig(data) ? data : null;
}

function toComponentStatus(
  status: DatadogComponentStatus,
): ComponentStatusValue {
  switch (status) {
    case "operational":
      return "operational";
    case "maintenance":
      return "under_maintenance";
    case "degraded":
      return "degraded_performance";
    case "partial_outage":
      return "partial_outage";
    case "major_outage":
      return "major_outage";
  }
}

function toIndicator(status: DatadogComponentStatus): StatusIndicator {
  switch (status) {
    case "operational":
      return "none";
    case "maintenance":
    case "degraded":
      return "minor";
    case "partial_outage":
      return "major";
    case "major_outage":
      return "critical";
  }
}

function toDayLevel(status: DatadogComponentStatus): DayStatus["level"] {
  switch (status) {
    case "operational":
    case "maintenance":
      return "operational";
    case "degraded":
      return "degraded";
    case "partial_outage":
      return "partial";
    case "major_outage":
      return "major";
  }
}

function leafComponents(config: DatadogConfig): DatadogComponent[] {
  return config.components.flatMap((entry) =>
    entry.type === "ComponentGroup" ? entry.components : [entry],
  );
}

function entryTime(entry: DatadogTimelineEntry): number {
  return new Date(entry.startedAt ?? entry.createdAt).getTime();
}

/** Each timeline entry holds until the next one, like on the Datadog page. */
function componentSpans(incidents: DatadogIncident[]): Map<string, DaySpan[]> {
  const spans = new Map<string, DaySpan[]>();
  const now = Date.now();

  for (const incident of incidents) {
    const timeline = [...(incident.timeline ?? [])].sort(
      (a, b) => entryTime(a) - entryTime(b),
    );
    timeline.forEach((entry, index) => {
      const next = timeline[index + 1];
      const start = entryTime(entry);
      const end = next ? entryTime(next) : incident.resolved ? start : now;
      for (const component of entry.componentsAffected ?? []) {
        const level = toDayLevel(component.status);
        if (level === "operational" || end <= start) {
          continue;
        }
        spans.set(component.id, [
          ...(spans.get(component.id) ?? []),
          { start: new Date(start), end: new Date(end), level },
        ]);
      }
    });
  }

  return spans;
}

/** Like the Datadog page: only partial and major outages count as downtime. */
function uptimePercent(spans: DaySpan[], windowStart: number): number {
  const now = Date.now();
  let downtime = 0;
  let cursor = windowStart;

  for (const span of spans
    .filter((span) => span.level === "partial" || span.level === "major")
    .sort((a, b) => a.start.getTime() - b.start.getTime())) {
    const from = Math.max(span.start.getTime(), cursor);
    const to = Math.min(span.end.getTime(), now);
    if (to > from) {
      downtime += to - from;
      cursor = to;
    }
  }

  return 100 * (1 - downtime / (now - windowStart));
}

/** The page counts uptime from its first known event, up to 90 days back. */
function uptimeWindowStart(config: DatadogConfig): number {
  const times = (config.incidents ?? [])
    .flatMap((incident) => incident.timeline ?? [])
    .map(entryTime);
  if (config.created) {
    times.push(new Date(config.created).getTime());
  }
  const historyStart = Date.now() - HISTORY_DAYS * DAY_MS;
  return times.length > 0
    ? Math.max(historyStart, Math.min(...times))
    : historyStart;
}

function mapIncident(incident: DatadogIncident): StatusIncident {
  const affected = incident.componentsAffected ?? [];
  const impact = worstIndicator(
    affected.map((component) => toIndicator(component.status)),
  );

  return {
    id: incident.id,
    name: incident.title,
    status: incident.currentStatus,
    impact: impact === "none" ? "minor" : impact,
    updatedAt: incident.lastModifiedAt,
    body: incident.description,
    affectedComponentIds: affected.map((component) => component.id),
  };
}

export const datadogAdapter: StatusAdapter = {
  async detect(siteUrl: string): Promise<boolean> {
    return (await fetchConfig(siteUrl)) !== null;
  },

  async fetchSnapshot(input: AdapterFetchInput): Promise<StatusSnapshot> {
    const normalized = normalizeSiteUrl(input.url);
    const config = await fetchConfig(normalized);
    if (!config) {
      throw new Error("Not a Datadog status page");
    }

    const components = leafComponents(config);
    const incidents = (config.incidents ?? [])
      .filter((incident) => !incident.resolved)
      .map(mapIncident);
    const indicator = worstIndicator([
      incidents.length > 0 ? "minor" : "none",
      ...components.map((component) => toIndicator(component.status)),
    ]);

    const status = {
      pageName: config.name,
      pageUrl: normalized,
      overallDescription: overallDescription(indicator, incidents.length),
      indicator,
      incidents,
      fetchedAt: new Date().toISOString(),
    };

    if (!input.includeHistory) {
      return {
        ...status,
        components: components.map((component) => ({
          id: component.id,
          name: component.name,
          status: toComponentStatus(component.status),
        })),
      };
    }

    const spans = componentSpans(config.incidents ?? []);
    const windowStart = uptimeWindowStart(config);
    const mappedComponents: ComponentStatus[] = components.map((component) => {
      const ownSpans = spans.get(component.id) ?? [];
      return {
        id: component.id,
        name: component.name,
        status: toComponentStatus(component.status),
        uptimePercent: uptimePercent(ownSpans, windowStart),
        historyDays: buildDayHistory(ownSpans),
      };
    });

    return {
      ...status,
      components: mappedComponents,
      historyDays: buildPageHistoryFromComponents(mappedComponents),
      uptimePercent: averageComponentUptime(mappedComponents),
    };
  },
};
