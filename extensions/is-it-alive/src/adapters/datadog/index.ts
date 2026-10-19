import type {
  ComponentStatusValue,
  FetchSnapshotInput,
  StatusAdapter,
  StatusIncident,
  StatusIndicator,
  StatusSnapshot,
} from "@/types";
import { worstIndicator } from "@/lib/indicator";
import { overallDescription } from "@/lib/snapshot-text";
import { getOrigin, normalizeSiteUrl } from "@/lib/url";
import type {
  DatadogComponent,
  DatadogComponentStatus,
  DatadogConfig,
  DatadogIncident,
} from "@/adapters/datadog/types";

const DATADOG_PAGE_URL = /\.statuspage\.datadoghq\.[a-z]+/;

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

function leafComponents(config: DatadogConfig): DatadogComponent[] {
  return config.components.flatMap((entry) =>
    entry.type === "ComponentGroup" ? entry.components : [entry],
  );
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

  async fetchSnapshot(input: FetchSnapshotInput): Promise<StatusSnapshot> {
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

    return {
      pageName: config.name,
      pageUrl: normalized,
      overallDescription: overallDescription(indicator, incidents.length),
      indicator,
      components: components.map((component) => ({
        id: component.id,
        name: component.name,
        status: toComponentStatus(component.status),
      })),
      incidents,
      fetchedAt: new Date().toISOString(),
    };
  },
};
