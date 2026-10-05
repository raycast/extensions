import type {
  ComponentStatusValue,
  DayStatus,
  FetchSnapshotInput,
  StatusAdapter,
  StatusIncident,
  StatusSnapshot,
} from "@/types";
import { getOrigin, normalizeSiteUrl } from "@/lib/url";
import { fetchJson } from "@/lib/fetch-json";
import {
  averageComponentUptime,
  buildPageHistoryFromComponents,
  calcUptimePercent,
} from "@/lib/uptime-chart";
import {
  componentUptimeFromData,
  fetchStatuspageUptimeData,
} from "@/lib/statuspage-uptime";
import { StatuspageSummary, StatuspageIncident } from "@/types/statuspage";

function isActiveStatuspageIncident(incident: { status: string }): boolean {
  return incident.status !== "resolved" && incident.status !== "postmortem";
}

function resolveActiveIncidents(
  summaryIncidents: StatuspageSummary["incidents"],
  allIncidents: StatuspageIncident[],
): Array<
  StatuspageIncident | NonNullable<StatuspageSummary["incidents"]>[number]
> {
  const incidents = summaryIncidents ?? allIncidents;
  return incidents.filter(isActiveStatuspageIncident);
}

function mapIncidents(
  incidents: Array<
    StatuspageIncident | NonNullable<StatuspageSummary["incidents"]>[number]
  >,
): StatusIncident[] {
  return incidents.map((incident) => ({
    id: incident.id,
    name: incident.name,
    status: incident.status,
    impact: incident.impact,
    updatedAt: incident.updated_at,
    body: incident.incident_updates?.[0]?.body,
    affectedComponentIds:
      incident.components?.map((c) => c.id) ??
      incident.incident_updates?.[0]?.affected_components?.map((c) => c.code),
  }));
}

function impactToLevel(impact: string): DayStatus["level"] {
  switch (impact) {
    case "none":
      return "operational";
    case "minor":
      return "degraded";
    case "major":
      return "partial";
    case "critical":
      return "major";
    default:
      return "degraded";
  }
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function incidentAffectsComponent(
  incident: StatuspageIncident,
  componentId: string,
): boolean {
  if (incident.components?.some((c) => c.id === componentId)) {
    return true;
  }

  return (
    incident.incident_updates?.some((update) =>
      update.affected_components?.some((c) => c.code === componentId),
    ) ?? false
  );
}

/** Fallback when `window.uptimeData` is unavailable. */
function buildHistoryFromIncidents(
  incidents: StatuspageIncident[],
  days = 90,
): DayStatus[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayMap = new Map<string, DayStatus["level"]>();

  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (days - 1 - i));
    dayMap.set(formatLocalDate(d), "operational");
  }

  const severity: Record<DayStatus["level"], number> = {
    operational: 0,
    degraded: 1,
    partial: 2,
    major: 3,
    unknown: 0,
  };

  for (const incident of incidents) {
    const start = new Date(incident.created_at);
    const end = incident.resolved_at ? new Date(incident.resolved_at) : today;
    const level = impactToLevel(incident.impact);

    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);

    while (cursor <= endDay) {
      const key = formatLocalDate(cursor);
      const existing = dayMap.get(key);
      if (existing !== undefined && severity[level] > severity[existing]) {
        dayMap.set(key, level);
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, level]) => ({ date, level }));
}

export const statuspageAdapter: StatusAdapter = {
  async detect(siteUrl: string): Promise<boolean> {
    try {
      const origin = getOrigin(normalizeSiteUrl(siteUrl));
      await fetchJson<StatuspageSummary>(`${origin}/api/v2/summary.json`);
      return true;
    } catch {
      return false;
    }
  },

  async fetchSnapshot(input: FetchSnapshotInput): Promise<StatusSnapshot> {
    const normalized = normalizeSiteUrl(input.url);
    const origin = getOrigin(normalized);
    const fetchedAt = new Date().toISOString();

    try {
      const [summary, allIncidents, uptimeData] = await Promise.all([
        fetchJson<StatuspageSummary>(`${origin}/api/v2/summary.json`),
        fetchJson<{ incidents: StatuspageIncident[] }>(
          `${origin}/api/v2/incidents.json`,
        ).catch(() => ({ incidents: [] as StatuspageIncident[] })),
        fetchStatuspageUptimeData(normalized),
      ]);

      const incidents = allIncidents.incidents ?? [];
      const fallbackHistory = buildHistoryFromIncidents(incidents);

      const components = (summary.components ?? [])
        .filter((c) => !c.group)
        .map((c) => {
          const fromUptime = componentUptimeFromData(uptimeData[c.id]);
          if (fromUptime) {
            return {
              id: c.id,
              name: c.name,
              status: c.status as ComponentStatusValue,
              historyDays: fromUptime.historyDays,
              uptimePercent: fromUptime.uptimePercent,
            };
          }

          return {
            id: c.id,
            name: c.name,
            status: c.status as ComponentStatusValue,
            historyDays: buildHistoryFromIncidents(
              incidents.filter((incident) =>
                incidentAffectsComponent(incident, c.id),
              ),
            ),
          };
        });

      const pageHistoryDays = buildPageHistoryFromComponents(components);
      const uptimePercent =
        averageComponentUptime(components) ??
        (pageHistoryDays.length > 0
          ? calcUptimePercent(pageHistoryDays)
          : undefined);

      const activeIncidents = resolveActiveIncidents(
        summary.incidents,
        incidents,
      );

      return {
        pageName: summary.page.name,
        pageUrl: summary.page.url || normalized,
        overallDescription: summary.status.description,
        indicator: summary.status.indicator,
        components,
        incidents: mapIncidents(activeIncidents),
        historyDays:
          pageHistoryDays.length > 0 ? pageHistoryDays : fallbackHistory,
        uptimePercent,
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
