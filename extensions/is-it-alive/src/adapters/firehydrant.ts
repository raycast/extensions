import type {
  ComponentStatusValue,
  FetchSnapshotInput,
  StatusAdapter,
  StatusIncident,
  StatusIndicator,
  StatusSnapshot,
} from "@/types";
import type {
  FireHydrantIncident,
  FireHydrantPayload,
} from "@/types/firehydrant";
import { fetchJson } from "@/lib/fetch-json";
import { overallDescription } from "@/lib/snapshot-text";
import { getOrigin, normalizeSiteUrl } from "@/lib/url";

function payloadUrl(siteUrl: string): string {
  return `${getOrigin(normalizeSiteUrl(siteUrl))}/data/payload.json`;
}

export function isFireHydrantPayload(
  data: unknown,
): data is FireHydrantPayload {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  if (!("config" in data) || typeof data.config !== "object" || !data.config) {
    return false;
  }

  if (!("components" in data) || !Array.isArray(data.components)) {
    return false;
  }

  return "incidents" in data && Array.isArray(data.incidents);
}

function conditionCode(
  condition: string | undefined,
  conditions: Record<string, string> | undefined,
): string {
  if (!condition) {
    return "operational";
  }

  return (conditions?.[condition] ?? condition).toLowerCase();
}

function conditionToComponentStatus(
  condition: string | undefined,
  conditions: Record<string, string> | undefined,
): ComponentStatusValue {
  switch (conditionCode(condition, conditions)) {
    case "operational":
      return "operational";
    case "degraded":
    case "degraded_performance":
      return "degraded_performance";
    case "maintenance":
    case "under_maintenance":
      return "under_maintenance";
    case "partial_outage":
      return "partial_outage";
    case "unavailable":
    case "offline":
    case "major_outage":
      return "major_outage";
    default:
      return "degraded_performance";
  }
}

function statusToIndicator(
  status: ComponentStatusValue | string,
): StatusIndicator {
  switch (status) {
    case "operational":
      return "none";
    case "degraded_performance":
    case "under_maintenance":
      return "minor";
    case "partial_outage":
      return "major";
    case "major_outage":
      return "critical";
    default:
      return "minor";
  }
}

function worseIndicator(
  current: StatusIndicator,
  next: StatusIndicator,
): StatusIndicator {
  const order: StatusIndicator[] = ["none", "minor", "major", "critical"];
  return order.indexOf(next) > order.indexOf(current) ? next : current;
}

function isActiveIncident(incident: FireHydrantIncident): boolean {
  return !incident.timestamps?.resolved;
}

function latestTimestamp(
  timestamps: FireHydrantIncident["timestamps"],
): string {
  let latest = "";
  for (const value of Object.values(timestamps ?? {})) {
    if (value && value > latest) {
      latest = value;
    }
  }
  return latest;
}

function severityToImpact(slug: string | undefined): string {
  switch (slug) {
    case "SEV1":
    case "SEV2":
      return "critical";
    case "SEV3":
      return "major";
    case "MAINTENANCE":
      return "maintenance";
    case "SEV4":
    case "UNSET":
      return "minor";
    default:
      return slug?.toLowerCase() ?? "minor";
  }
}

function mapIncident(incident: FireHydrantIncident): StatusIncident {
  const affectedComponentIds = (incident.components ?? [])
    .map((component) => component.id)
    .filter(Boolean);

  return {
    id: incident.id,
    name: incident.title,
    status: isActiveIncident(incident) ? "active" : "resolved",
    impact: severityToImpact(incident.severitySlug),
    updatedAt: latestTimestamp(incident.timestamps),
    affectedComponentIds:
      affectedComponentIds.length > 0 ? affectedComponentIds : undefined,
  };
}

function activeIncidentComponentConditions(
  incidents: FireHydrantIncident[],
): Map<string, string> {
  const byId = new Map<string, string>();

  for (const incident of incidents) {
    for (const component of incident.components ?? []) {
      if (component.id && component.condition) {
        byId.set(component.id, component.condition);
      }
    }
  }

  return byId;
}

export const firehydrantAdapter: StatusAdapter = {
  async detect(siteUrl: string): Promise<boolean> {
    try {
      const data = await fetchJson<unknown>(payloadUrl(siteUrl));
      return isFireHydrantPayload(data);
    } catch {
      return false;
    }
  },

  async fetchSnapshot(input: FetchSnapshotInput): Promise<StatusSnapshot> {
    const normalized = normalizeSiteUrl(input.url);
    const fetchedAt = new Date().toISOString();

    try {
      const data = await fetchJson<unknown>(payloadUrl(normalized));
      if (!isFireHydrantPayload(data)) {
        throw new Error("Not a FireHydrant status page");
      }

      const activeIncidents = (data.incidents ?? []).filter(isActiveIncident);
      const activeIncidentConditions =
        activeIncidentComponentConditions(activeIncidents);
      const components = (data.components ?? []).map((component) => ({
        id: component.id,
        name: component.name,
        status: conditionToComponentStatus(
          activeIncidentConditions.get(component.id),
          data.conditions,
        ),
      }));

      const indicator = components.reduce<StatusIndicator>(
        (worst, component) =>
          worseIndicator(worst, statusToIndicator(component.status)),
        activeIncidents.length > 0 ? "minor" : "none",
      );

      const pageName =
        data.config.title?.trim() ||
        data.config.companyName?.trim() ||
        new URL(normalized).hostname;

      return {
        pageName,
        pageUrl: normalized,
        overallDescription:
          activeIncidents.length === 0
            ? (data.config.operationalMessage?.trim() ??
              overallDescription(indicator, 0))
            : overallDescription(indicator, activeIncidents.length),
        indicator,
        components,
        incidents: activeIncidents.map(mapIncident),
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
