import type {
  ComponentStatusValue,
  DayStatus,
  StatusAdapter,
  StatusIncident,
  StatusIndicator,
  StatusSnapshot,
} from "@/types";
import { normalizeSiteUrl } from "@/lib/url";
import { overallDescription } from "@/lib/snapshot-text";
import {
  averageComponentUptime,
  buildPageHistoryFromComponents,
} from "@/lib/uptime-chart";
import {
  RailwayStatusResponse,
  RailwayComponent,
  RailwayDay,
  RailwayDayStatus,
} from "@/types/railway";

const RAILWAY_API = "https://status.railway.com/api/status";
const RAILWAY_PAGE = "https://status.railway.com";

function railwayDayToLevel(status: RailwayDayStatus): DayStatus["level"] {
  switch (status) {
    case "operational":
      return "operational";
    case "degraded":
      return "degraded";
    case "major":
      return "major";
    case "none":
      return "unknown";
    default:
      return "unknown";
  }
}

function railwayDayToComponentStatus(
  status: RailwayDayStatus,
): ComponentStatusValue | string {
  switch (status) {
    case "operational":
      return "operational";
    case "degraded":
      return "degraded_performance";
    case "major":
      return "major_outage";
    default:
      return "operational";
  }
}

function flattenComponents(
  entries: RailwayStatusResponse["entries"],
): RailwayComponent[] {
  return entries
    .filter((entry) => entry.type === "component")
    .map((entry) => entry.data);
}

function getComponentDays(component: RailwayComponent): RailwayDay[] {
  return (component.months ?? [])
    .flatMap((month) => month.days ?? [])
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getLatestDayStatus(component: RailwayComponent): RailwayDayStatus {
  const today = new Date().toISOString().slice(0, 10);
  const days = getComponentDays(component).filter(
    (d) => d.date <= today && d.status !== "none",
  );

  if (days.length === 0) {
    return "operational";
  }

  return days[days.length - 1].status;
}

function buildComponentHistory(component: RailwayComponent): DayStatus[] {
  const today = new Date().toISOString().slice(0, 10);
  return getComponentDays(component)
    .filter((d) => d.date <= today && d.status !== "none")
    .slice(-90)
    .map((d) => ({ date: d.date, level: railwayDayToLevel(d.status) }));
}

function worstIndicator(
  components: RailwayComponent[],
  activeCount: number,
): StatusIndicator {
  if (activeCount > 0) {
    return "minor";
  }

  let worst: StatusIndicator = "none";

  for (const component of components) {
    const dayStatus = getLatestDayStatus(component);
    if (dayStatus === "major") {
      return "major";
    }
    if (dayStatus === "degraded" && worst === "none") {
      worst = "minor";
    }
  }

  return worst;
}

function mapActiveIncidents(
  incidents: RailwayStatusResponse["activeIncidents"],
): StatusIncident[] {
  return incidents.map((incident) => ({
    id: incident.id,
    name: incident.title,
    status: incident.status.toLowerCase(),
    impact: "minor",
    updatedAt: incident.createdAt,
    body: incident.updates?.[0]?.message,
    affectedComponentIds: incident.components?.map((c) => c.id),
  }));
}

export const railwayAdapter: StatusAdapter = {
  async detect(siteUrl: string): Promise<boolean> {
    try {
      const host = new URL(normalizeSiteUrl(siteUrl)).hostname;
      return host === "status.railway.app" || host === "status.railway.com";
    } catch {
      return false;
    }
  },

  async fetchSnapshot(): Promise<StatusSnapshot> {
    const fetchedAt = new Date().toISOString();

    try {
      const response = await fetch(RAILWAY_API, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as RailwayStatusResponse;
      const components = flattenComponents(data.entries);

      const mappedComponents = components.map((component) => {
        const latest = getLatestDayStatus(component);
        const uptime = component.uptimePercentage?.replace("%", "");

        return {
          id: component.id,
          name: component.name,
          status: railwayDayToComponentStatus(latest),
          uptimePercent: uptime ? parseFloat(uptime) : undefined,
          historyDays: buildComponentHistory(component),
        };
      });

      const incidents = mapActiveIncidents(data.activeIncidents);
      const indicator = worstIndicator(components, incidents.length);
      const uptimePercent = averageComponentUptime(mappedComponents);

      return {
        pageName: "Railway",
        pageUrl: RAILWAY_PAGE,
        overallDescription: overallDescription(indicator, incidents.length),
        indicator,
        components: mappedComponents,
        incidents,
        historyDays: buildPageHistoryFromComponents(mappedComponents),
        uptimePercent,
        fetchedAt,
      };
    } catch (error) {
      return {
        pageName: "Railway",
        pageUrl: RAILWAY_PAGE,
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
