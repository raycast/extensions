import type {
  ComponentStatusValue,
  DayStatus,
  StatusAdapter,
  StatusIncident,
  StatusIndicator,
  StatusSnapshot,
} from "@/types";
import { getOrigin, normalizeSiteUrl } from "@/lib/url";
import { fetchJson } from "@/lib/fetch-json";
import { overallDescription } from "@/lib/snapshot-text";
import {
  averageComponentUptime,
  buildPageHistoryFromComponents,
} from "@/lib/uptime-chart";
import {
  BetterStackAggregateState,
  BetterStackIncludedItem,
  BetterStackIndexResponse,
  BetterStackResourceStatus,
  BetterStackStatusHistoryDay,
} from "@/types/betterstack";

function indexJsonUrl(siteUrl: string): string {
  const origin = getOrigin(normalizeSiteUrl(siteUrl));
  return `${origin}/index.json`;
}

function isBetterStackResponse(
  data: unknown,
): data is BetterStackIndexResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "data" in data &&
    typeof data.data === "object" &&
    data.data !== null &&
    "type" in data.data &&
    data.data.type === "status_page"
  );
}

function includedByType<T extends BetterStackIncludedItem["type"]>(
  included: BetterStackIncludedItem[],
  type: T,
): Extract<BetterStackIncludedItem, { type: T }>[] {
  return included.filter(
    (item): item is Extract<BetterStackIncludedItem, { type: T }> =>
      item.type === type,
  );
}

function includedById(
  included: BetterStackIncludedItem[],
  id: string,
): BetterStackIncludedItem | undefined {
  return included.find((item) => item.id === id);
}

function resourceStatusToDayLevel(
  status: BetterStackResourceStatus,
): DayStatus["level"] {
  switch (status) {
    case "operational":
      return "operational";
    case "degraded":
      return "degraded";
    case "downtime":
      return "major";
    case "maintenance":
      return "degraded";
    case "not_monitored":
      return "unknown";
    default:
      return "unknown";
  }
}

function resourceStatusToComponentStatus(
  status: BetterStackResourceStatus,
): ComponentStatusValue | string {
  switch (status) {
    case "operational":
      return "operational";
    case "degraded":
      return "degraded_performance";
    case "downtime":
      return "major_outage";
    case "maintenance":
      return "under_maintenance";
    case "not_monitored":
      return "operational";
    default:
      return "operational";
  }
}

function aggregateStateToIndicator(
  state: BetterStackAggregateState,
): StatusIndicator {
  switch (state) {
    case "operational":
    case "resolved":
      return "none";
    case "degraded":
    case "maintenance":
      return "minor";
    case "downtime":
      return "critical";
    default:
      return "minor";
  }
}

function aggregateStateToImpact(state: BetterStackAggregateState): string {
  switch (state) {
    case "operational":
    case "resolved":
      return "none";
    case "degraded":
      return "minor";
    case "maintenance":
      return "minor";
    case "downtime":
      return "critical";
    default:
      return "minor";
  }
}

function aggregateStateDescription(state: BetterStackAggregateState): string {
  switch (state) {
    case "operational":
      return "All Systems Operational";
    case "degraded":
      return "Degraded Performance";
    case "downtime":
      return "Major Outage";
    case "maintenance":
      return "Scheduled Maintenance";
    case "resolved":
      return "All Systems Operational";
    default:
      return "Unknown";
  }
}

function buildHistoryDays(history: BetterStackStatusHistoryDay[]): DayStatus[] {
  return history.map((day) => ({
    date: day.day,
    level: resourceStatusToDayLevel(day.status),
  }));
}

function isActiveReport(
  report: Extract<BetterStackIncludedItem, { type: "status_report" }>,
): boolean {
  if (report.attributes.aggregate_state === "resolved") {
    return false;
  }

  if (report.attributes.ends_at) {
    return false;
  }

  return report.attributes.affected_resources.some(
    (resource) => resource.status !== "resolved",
  );
}

function mapActiveIncidents(
  included: BetterStackIncludedItem[],
): StatusIncident[] {
  const reports = includedByType(included, "status_report").filter(
    isActiveReport,
  );

  return reports.map((report) => {
    const updateIds =
      report.relationships.status_updates.data?.map((update) => update.id) ??
      [];
    const updates = updateIds
      .map((id) => includedById(included, id))
      .filter(
        (
          item,
        ): item is Extract<
          BetterStackIncludedItem,
          { type: "status_update" }
        > => item?.type === "status_update",
      )
      .sort(
        (a, b) =>
          new Date(b.attributes.published_at).getTime() -
          new Date(a.attributes.published_at).getTime(),
      );

    const latestUpdate = updates[0];

    return {
      id: report.id,
      name: report.attributes.title,
      status: report.attributes.aggregate_state,
      impact: aggregateStateToImpact(report.attributes.aggregate_state),
      updatedAt:
        latestUpdate?.attributes.published_at ?? report.attributes.starts_at,
      body: latestUpdate?.attributes.message,
      affectedComponentIds: report.attributes.affected_resources
        .filter((resource) => resource.status !== "resolved")
        .map((resource) => resource.status_page_resource_id),
    };
  });
}

export const betterstackAdapter: StatusAdapter = {
  async detect(siteUrl: string): Promise<boolean> {
    try {
      const data = await fetchJson<unknown>(indexJsonUrl(siteUrl));
      return isBetterStackResponse(data);
    } catch {
      return false;
    }
  },

  async fetchSnapshot(siteUrl: string): Promise<StatusSnapshot> {
    const normalized = normalizeSiteUrl(siteUrl);
    const fetchedAt = new Date().toISOString();

    try {
      const response = await fetchJson<BetterStackIndexResponse>(
        indexJsonUrl(normalized),
      );

      const { attributes } = response.data;
      const included = response.included ?? [];
      const resources = includedByType(included, "status_page_resource");

      const components = resources
        .map((resource) => ({
          id: resource.id,
          name: resource.attributes.public_name,
          status: resourceStatusToComponentStatus(resource.attributes.status),
          uptimePercent: resource.attributes.availability * 100,
          historyDays: buildHistoryDays(resource.attributes.status_history),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const incidents = mapActiveIncidents(included);
      const indicator =
        incidents.length > 0
          ? aggregateStateToIndicator(
              incidents.some((incident) => incident.impact === "critical")
                ? "downtime"
                : "degraded",
            )
          : aggregateStateToIndicator(attributes.aggregate_state);

      const overall =
        incidents.length > 0
          ? overallDescription(indicator, incidents.length)
          : aggregateStateDescription(attributes.aggregate_state);

      const uptimePercent = averageComponentUptime(components);

      return {
        pageName: attributes.company_name,
        pageUrl: normalized,
        overallDescription: overall,
        indicator,
        components,
        incidents,
        historyDays: buildPageHistoryFromComponents(components),
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
