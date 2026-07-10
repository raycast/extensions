import type {
  ComponentStatus,
  ComponentStatusValue,
  DayStatus,
  FetchSnapshotInput,
  StatusAdapter,
  StatusIncident,
  StatusIndicator,
  StatusSnapshot,
} from "@/types";
import { normalizeSiteUrl } from "@/lib/url";
import { fetchJson } from "@/lib/fetch-json";
import { overallDescription } from "@/lib/snapshot-text";
import { buildPageHistoryFromComponents } from "@/lib/uptime-chart";
import type {
  SalesforceIncident,
  SalesforceInstance,
  SalesforceProduct,
} from "@/types/salesforce";

const TRUST_HOST = "status.salesforce.com";
/** status.heroku.com is deprecated; Heroku status now lives on Salesforce Trust. */
const HEROKU_HOST = "status.heroku.com";
const API_BASE = "https://api.status.salesforce.com/v1";
const DEFAULT_PRODUCT = "Salesforce_Services";
const HISTORY_DAYS = 90;
const INCIDENTS_PAGE_SIZE = 200;
const MAX_INCIDENT_PAGES = 5;

function productKeyFromUrl(siteUrl: string): string {
  const url = new URL(normalizeSiteUrl(siteUrl));

  if (url.hostname === HEROKU_HOST) {
    return "Heroku";
  }

  const match = url.pathname.match(/^\/products\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : DEFAULT_PRODUCT;
}

function instanceStatusToComponentStatus(status: string): ComponentStatusValue {
  if (status === "OK") {
    return "operational";
  }
  if (status.startsWith("MAJOR_INCIDENT")) {
    return "major_outage";
  }
  if (status.startsWith("MINOR_INCIDENT")) {
    return "degraded_performance";
  }
  if (status.startsWith("MAINTENANCE")) {
    return "under_maintenance";
  }
  return "operational";
}

function instanceStatusToIndicator(status: string): StatusIndicator {
  if (status.startsWith("MAJOR_INCIDENT")) {
    return "critical";
  }
  if (status.startsWith("MINOR_INCIDENT") || status.startsWith("MAINTENANCE")) {
    return "minor";
  }
  return "none";
}

const INDICATOR_SEVERITY: Record<StatusIndicator, number> = {
  none: 0,
  minor: 1,
  major: 2,
  critical: 3,
};

function worstIndicator(indicators: StatusIndicator[]): StatusIndicator {
  return indicators.reduce<StatusIndicator>(
    (worst, indicator) =>
      INDICATOR_SEVERITY[indicator] > INDICATOR_SEVERITY[worst]
        ? indicator
        : worst,
    "none",
  );
}

/** "HEROKUVIRGINIA" with product "Heroku" becomes "Virginia (NA)". */
function instanceDisplayName(
  instance: SalesforceInstance,
  productKey: string,
): string {
  const productPrefix = productKey.replace(/[^a-z0-9]/gi, "").toUpperCase();
  const key = instance.key.toUpperCase();

  let label = instance.key;
  if (productPrefix && key.startsWith(productPrefix)) {
    const rest = instance.key.slice(productPrefix.length);
    if (rest.length > 1) {
      label = rest.charAt(0).toUpperCase() + rest.slice(1).toLowerCase();
    }
  }

  return instance.location ? `${label} (${instance.location})` : label;
}

async function fetchIncidentsSince(
  startTime: string,
): Promise<SalesforceIncident[]> {
  const incidents: SalesforceIncident[] = [];

  for (let page = 0; page < MAX_INCIDENT_PAGES; page++) {
    const batch = await fetchJson<SalesforceIncident[]>(
      `${API_BASE}/incidents?startTime=${encodeURIComponent(startTime)}&limit=${INCIDENTS_PAGE_SIZE}&offset=${page * INCIDENTS_PAGE_SIZE}`,
    );

    incidents.push(...batch);

    if (batch.length < INCIDENTS_PAGE_SIZE) {
      break;
    }
  }

  return incidents;
}

function incidentSeverity(incident: SalesforceIncident): "minor" | "major" {
  const severities = (incident.IncidentImpacts ?? []).map(
    (impact) => impact.severity,
  );
  return severities.includes("major") ? "major" : "minor";
}

function incidentWindow(incident: SalesforceIncident): {
  start: Date;
  end: Date;
} {
  const impacts = incident.IncidentImpacts ?? [];

  const startTimes = impacts
    .map((impact) => impact.startTime)
    .filter((time): time is string => Boolean(time));
  const start = startTimes.length
    ? new Date(Math.min(...startTimes.map((time) => new Date(time).getTime())))
    : new Date(incident.createdAt);

  if (incident.status === "Active") {
    return { start, end: new Date() };
  }

  const endTimes = impacts
    .map((impact) => impact.endTime)
    .filter((time): time is string => Boolean(time));
  const end = endTimes.length
    ? new Date(Math.max(...endTimes.map((time) => new Date(time).getTime())))
    : new Date(incident.updatedAt ?? incident.createdAt);

  return { start, end };
}

function buildInstanceHistory(
  instanceKey: string,
  incidents: SalesforceIncident[],
): DayStatus[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayMap = new Map<string, DayStatus["level"]>();
  for (let i = 0; i < HISTORY_DAYS; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (HISTORY_DAYS - 1 - i));
    dayMap.set(d.toISOString().slice(0, 10), "operational");
  }

  for (const incident of incidents) {
    if (!incident.affectsAll && !incident.instanceKeys.includes(instanceKey)) {
      continue;
    }

    const level: DayStatus["level"] =
      incidentSeverity(incident) === "major" ? "major" : "degraded";
    const { start, end } = incidentWindow(incident);

    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);

    while (cursor <= endDay) {
      const key = cursor.toISOString().slice(0, 10);
      const existing = dayMap.get(key);
      if (existing && (existing === "operational" || level === "major")) {
        dayMap.set(key, level);
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, level]) => ({ date, level }));
}

function incidentName(incident: SalesforceIncident): string {
  const type = incident.type ?? "Incident";
  const services = incident.serviceKeys ?? [];
  return services.length ? `${type}: ${services.join(", ")}` : type;
}

function latestEventMessage(incident: SalesforceIncident): string | undefined {
  const events = [...(incident.IncidentEvents ?? [])].sort((a, b) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
  );
  return events[0]?.message;
}

function mapActiveIncidents(
  incidents: SalesforceIncident[],
  instanceKeys: Set<string>,
): StatusIncident[] {
  return incidents
    .filter((incident) => incident.status === "Active")
    .map((incident) => ({
      id: String(incident.id),
      name: incidentName(incident),
      status: incident.status.toLowerCase(),
      impact: incidentSeverity(incident) === "major" ? "major" : "minor",
      updatedAt: incident.updatedAt ?? incident.createdAt,
      body: latestEventMessage(incident),
      affectedComponentIds: incident.instanceKeys.filter((key) =>
        instanceKeys.has(key),
      ),
    }));
}

export const salesforceAdapter: StatusAdapter = {
  async detect(siteUrl: string): Promise<boolean> {
    try {
      const hostname = new URL(normalizeSiteUrl(siteUrl)).hostname;
      return hostname === TRUST_HOST || hostname === HEROKU_HOST;
    } catch {
      return false;
    }
  },

  async fetchSnapshot(input: FetchSnapshotInput): Promise<StatusSnapshot> {
    const fetchedAt = new Date().toISOString();
    const pageUrl = normalizeSiteUrl(input.url);

    let productKey = DEFAULT_PRODUCT;
    try {
      productKey = productKeyFromUrl(input.url);

      const historyStart = new Date();
      historyStart.setDate(historyStart.getDate() - HISTORY_DAYS);
      historyStart.setHours(0, 0, 0, 0);

      const [product, instances, allIncidents] = await Promise.all([
        fetchJson<SalesforceProduct>(
          `${API_BASE}/products/${encodeURIComponent(productKey)}`,
        ).catch(() => null),
        fetchJson<SalesforceInstance[]>(
          `${API_BASE}/instances?products=${encodeURIComponent(productKey)}`,
        ),
        fetchIncidentsSince(historyStart.toISOString()),
      ]);

      const activeInstances = instances.filter((instance) => instance.isActive);
      if (activeInstances.length === 0) {
        throw new Error(`No instances found for product "${productKey}"`);
      }

      const instanceKeys = new Set(
        activeInstances.map((instance) => instance.key),
      );
      const productIncidents = allIncidents.filter(
        (incident) =>
          incident.affectsAll ||
          incident.instanceKeys.some((key) => instanceKeys.has(key)),
      );

      const components: ComponentStatus[] = activeInstances.map((instance) => ({
        id: instance.key,
        name: instanceDisplayName(instance, productKey),
        status: instanceStatusToComponentStatus(instance.status),
        historyDays: buildInstanceHistory(instance.key, productIncidents),
      }));

      const incidents = mapActiveIncidents(productIncidents, instanceKeys);
      const indicator = worstIndicator(
        activeInstances.map((instance) =>
          instanceStatusToIndicator(instance.status),
        ),
      );

      const pageName =
        product?.altDisplayName ??
        product?.name ??
        productKey.replace(/_/g, " ");

      return {
        pageName,
        pageUrl,
        overallDescription: overallDescription(indicator, incidents.length),
        indicator,
        components,
        incidents,
        historyDays: buildPageHistoryFromComponents(components),
        fetchedAt,
      };
    } catch (error) {
      return {
        pageName: productKey.replace(/_/g, " "),
        pageUrl,
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
