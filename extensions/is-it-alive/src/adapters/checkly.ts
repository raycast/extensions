import type {
  ComponentStatus,
  ComponentStatusValue,
  DayStatus,
  StatusAdapter,
  StatusIncident,
  StatusIndicator,
  StatusSnapshot,
} from "@/types";
import { getOrigin, normalizeSiteUrl } from "@/lib/url";
import { overallDescription } from "@/lib/snapshot-text";
import {
  averageComponentUptime,
  buildPageHistoryFromComponents,
} from "@/lib/uptime-chart";
import {
  ChecklyDayEvent,
  ChecklyIncident,
  ChecklyPayload,
  ChecklyService,
  ChecklyStatusPageInfo,
  ChecklyUptimeCard,
} from "@/types/checkly";

const NUXT_DATA_PATTERN =
  /<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/;

const REF_TAGS = new Set(["ShallowReactive", "Reactive", "Ref", "ShallowRef"]);

/**
 * Checkly status pages are Nuxt apps with no public JSON API; all data is
 * embedded in the HTML as a devalue-encoded `__NUXT_DATA__` payload (a flat
 * array where objects/arrays reference other entries by index).
 */
function hydrateNuxtData(
  values: unknown[],
  index: unknown,
  // Indices on the current recursion path; a repeat means a cycle in a
  // malformed payload. Entries are removed on exit so devalue's legitimate
  // shared references (same index reachable via multiple paths) still resolve.
  visiting: Set<number> = new Set(),
): unknown {
  if (typeof index !== "number") {
    return index;
  }
  if (index < 0 || visiting.has(index)) {
    return undefined;
  }

  const value = values[index];
  visiting.add(index);

  try {
    if (Array.isArray(value)) {
      if (value.length === 2 && typeof value[0] === "string") {
        if (REF_TAGS.has(value[0])) {
          return hydrateNuxtData(values, value[1], visiting);
        }
        if (value[0] === "Date") {
          return value[1];
        }
      }
      return value.map((item) => hydrateNuxtData(values, item, visiting));
    }

    if (value !== null && typeof value === "object") {
      const result: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(value)) {
        result[key] = hydrateNuxtData(values, item, visiting);
      }
      return result;
    }

    return value;
  } finally {
    visiting.delete(index);
  }
}

function parseNuxtPayload(html: string): ChecklyPayload | null {
  const match = html.match(NUXT_DATA_PATTERN);
  if (!match) {
    return null;
  }

  let values: unknown[];
  try {
    values = JSON.parse(match[1]) as unknown[];
  } catch {
    return null;
  }

  const root = hydrateNuxtData(values, 0) as
    | { data?: Record<string, unknown> }
    | undefined;
  const data = root?.data;
  if (!data) {
    return null;
  }

  const resolverKey = Object.keys(data).find((key) =>
    key.startsWith("status-page-resolver-"),
  );
  if (!resolverKey) {
    return null;
  }

  const resolver = data[resolverKey] as
    | { statusPage?: ChecklyStatusPageInfo }
    | undefined;

  const incidentsEntry = Object.entries(data).find(([key]) =>
    key.startsWith("unresolved-incidents-"),
  )?.[1] as { incidents?: ChecklyIncident[] } | undefined;

  const uptimeEntry = Object.entries(data).find(([key]) =>
    key.startsWith("uptime-"),
  )?.[1] as { uptime?: ChecklyUptimeCard[] } | undefined;

  return {
    statusPage: resolver?.statusPage,
    incidents: incidentsEntry?.incidents ?? [],
    cards: uptimeEntry?.uptime ?? [],
  };
}

async function fetchPayload(siteUrl: string): Promise<ChecklyPayload | null> {
  const response = await fetch(siteUrl, {
    headers: { Accept: "text/html" },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return parseNuxtPayload(await response.text());
}

const SEVERITY_RANK: Record<string, number> = {
  MINOR: 1,
  MEDIUM: 2,
  MAJOR: 3,
};

function severityToDayLevel(severity: string | undefined): DayStatus["level"] {
  switch (severity) {
    case "MINOR":
      return "degraded";
    case "MEDIUM":
      return "partial";
    case "MAJOR":
      return "major";
    default:
      return "degraded";
  }
}

function severityToComponentStatus(
  severity: string | undefined,
): ComponentStatusValue {
  switch (severity) {
    case "MINOR":
      return "degraded_performance";
    case "MEDIUM":
      return "partial_outage";
    case "MAJOR":
      return "major_outage";
    default:
      return "degraded_performance";
  }
}

function severityToIndicator(severity: string | undefined): StatusIndicator {
  switch (severity) {
    case "MINOR":
      return "minor";
    case "MEDIUM":
      return "major";
    case "MAJOR":
      return "critical";
    default:
      return "minor";
  }
}

function severityToImpact(severity: string | undefined): string {
  switch (severity) {
    case "MINOR":
      return "minor";
    case "MEDIUM":
      return "major";
    case "MAJOR":
      return "critical";
    default:
      return "minor";
  }
}

function isUnresolved(event: ChecklyDayEvent): boolean {
  return event.lastUpdateStatus !== "RESOLVED";
}

function worstSeverity(events: ChecklyDayEvent[]): string | undefined {
  let worst: string | undefined;
  for (const event of events) {
    const rank = SEVERITY_RANK[event.severity ?? ""] ?? 1;
    if (worst === undefined || rank > (SEVERITY_RANK[worst] ?? 1)) {
      worst = event.severity;
    }
  }
  return worst;
}

function unresolvedEvents(service: ChecklyService): ChecklyDayEvent[] {
  return (service.days ?? []).flatMap((day) => day.events).filter(isUnresolved);
}

function buildServiceHistory(service: ChecklyService): DayStatus[] {
  return (service.days ?? []).map((day) => ({
    date: day.date.slice(0, 10),
    level:
      day.events.length > 0
        ? severityToDayLevel(worstSeverity(day.events))
        : ("operational" as const),
  }));
}

function mapComponents(cards: ChecklyUptimeCard[]): {
  components: ComponentStatus[];
  activeSeverities: string[];
} {
  const components: ComponentStatus[] = [];
  const activeSeverities: string[] = [];

  for (const card of cards) {
    for (const service of card.services ?? []) {
      const active = unresolvedEvents(service);
      if (active.length > 0) {
        activeSeverities.push(worstSeverity(active) ?? "MINOR");
      }

      components.push({
        id: service.id,
        name: service.name,
        status:
          active.length > 0
            ? severityToComponentStatus(worstSeverity(active))
            : "operational",
        uptimePercent: service.uptime,
        historyDays: buildServiceHistory(service),
      });
    }
  }

  return { components, activeSeverities };
}

function mapIncidents(incidents: ChecklyIncident[]): StatusIncident[] {
  return incidents.map((incident, index) => ({
    id: incident.id ?? `incident-${index}`,
    name: incident.name ?? "Incident",
    status: (
      incident.lastUpdateStatus ??
      incident.status ??
      "investigating"
    ).toLowerCase(),
    impact: severityToImpact(incident.severity),
    updatedAt:
      incident.updatedAt ??
      incident.created_at ??
      incident.createdAt ??
      new Date().toISOString(),
    body: incident.description,
  }));
}

function computeIndicator(
  incidents: ChecklyIncident[],
  activeSeverities: string[],
): StatusIndicator {
  const severities = [
    ...incidents.map((incident) => incident.severity),
    ...activeSeverities,
  ].filter((severity): severity is string => Boolean(severity));

  if (severities.length === 0 && incidents.length === 0) {
    return "none";
  }
  if (severities.length === 0) {
    return "minor";
  }

  let worst = severities[0];
  for (const severity of severities) {
    if ((SEVERITY_RANK[severity] ?? 1) > (SEVERITY_RANK[worst] ?? 1)) {
      worst = severity;
    }
  }

  return severityToIndicator(worst);
}

export const checklyAdapter: StatusAdapter = {
  async detect(siteUrl: string): Promise<boolean> {
    try {
      const origin = getOrigin(normalizeSiteUrl(siteUrl));
      const payload = await fetchPayload(origin);
      return payload !== null;
    } catch {
      return false;
    }
  },

  async fetchSnapshot(siteUrl: string): Promise<StatusSnapshot> {
    const normalized = normalizeSiteUrl(siteUrl);
    const origin = getOrigin(normalized);
    const fetchedAt = new Date().toISOString();

    try {
      const payload = await fetchPayload(origin);
      if (!payload) {
        throw new Error("Not a Checkly status page");
      }

      const { components, activeSeverities } = mapComponents(payload.cards);
      const incidents = mapIncidents(payload.incidents);
      const indicator = computeIndicator(payload.incidents, activeSeverities);

      return {
        pageName: payload.statusPage?.name ?? new URL(normalized).hostname,
        pageUrl: normalized,
        overallDescription: overallDescription(indicator, incidents.length),
        indicator,
        components,
        incidents,
        historyDays: buildPageHistoryFromComponents(components),
        uptimePercent: averageComponentUptime(components),
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
