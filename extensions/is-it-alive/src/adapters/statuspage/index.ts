import type {
  AdapterFetchInput,
  DayStatus,
  StatusAdapter,
  StatusIncident,
  StatusSnapshot,
} from "@/types";
import { getOrigin, normalizeSiteUrl } from "@/lib/url";
import { fetchJson } from "@/lib/fetch-json";
import { buildDayHistory } from "@/lib/day-history";
import {
  averageComponentUptime,
  buildPageHistoryFromComponents,
  calcUptimePercent,
} from "@/lib/uptime-chart";
import {
  dayLevelFromUptimeDay,
  fetchStatuspageUptime,
} from "@/adapters/statuspage/uptime";
import type {
  StatuspageSummary,
  StatuspageIncident,
} from "@/adapters/statuspage/types";

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

/** Fallback for pages without the uptime showcase. */
function buildHistoryFromIncidents(
  incidents: StatuspageIncident[],
): DayStatus[] {
  return buildDayHistory(
    incidents.map((incident) => ({
      start: new Date(incident.created_at),
      end: incident.resolved_at ? new Date(incident.resolved_at) : new Date(),
      level: impactToLevel(incident.impact),
    })),
  );
}

export const statuspageAdapter: StatusAdapter = {
  async detect(siteUrl: string): Promise<boolean> {
    const origin = getOrigin(normalizeSiteUrl(siteUrl));
    await fetchJson<StatuspageSummary>(`${origin}/api/v2/summary.json`);
    return true;
  },

  async fetchSnapshot(input: AdapterFetchInput): Promise<StatusSnapshot> {
    const normalized = normalizeSiteUrl(input.url);
    const origin = getOrigin(normalized);
    const fetchedAt = new Date().toISOString();

    const [summary, allIncidents] = await Promise.all([
      fetchJson<StatuspageSummary>(`${origin}/api/v2/summary.json`),
      input.includeHistory
        ? fetchJson<{ incidents: StatuspageIncident[] }>(
            `${origin}/api/v2/incidents.json`,
          ).catch(() => null)
        : null,
    ]);

    const status = {
      pageName: summary.page.name,
      pageUrl: summary.page.url || normalized,
      overallDescription: summary.status.description,
      indicator: summary.status.indicator,
      incidents: mapIncidents(
        resolveActiveIncidents(
          summary.incidents,
          allIncidents?.incidents ?? [],
        ),
      ),
      fetchedAt,
    };

    if (!input.includeHistory) {
      return { ...status, components: [] };
    }

    const leafComponents = (summary.components ?? []).filter((c) => !c.group);
    const uptime = await fetchStatuspageUptime(
      origin,
      leafComponents.map((c) => c.id),
    );
    const incidents = allIncidents?.incidents ?? [];

    const components = leafComponents.map((c) => {
      const componentUptime = uptime.get(c.id);

      return {
        id: c.id,
        name: c.name,
        status: c.status,
        uptimePercent: componentUptime?.uptimePercent,
        historyDays: componentUptime
          ? componentUptime.days.map((day) => ({
              date: day.date.slice(0, 10),
              level: dayLevelFromUptimeDay(day),
            }))
          : buildHistoryFromIncidents(
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

    return {
      ...status,
      components,
      historyDays:
        pageHistoryDays.length > 0
          ? pageHistoryDays
          : buildHistoryFromIncidents(incidents),
      uptimePercent,
    };
  },
};
