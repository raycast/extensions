import type {
  ComponentStatus,
  ComponentStatusValue,
  DayStatus,
  AdapterFetchInput,
  StatusAdapter,
  StatusIncident,
  StatusIndicator,
  StatusSnapshot,
} from "@/types";
import { getOrigin, normalizeSiteUrl } from "@/lib/url";
import { fetchJson } from "@/lib/fetch-json";
import { overallDescription } from "@/lib/snapshot-text";
import { extractBalancedObject } from "@/lib/balanced-json";
import { buildDayHistory, type DaySpan } from "@/lib/day-history";
import { worstIndicator } from "@/lib/indicator";
import {
  averageComponentUptime,
  buildPageHistoryFromComponents,
} from "@/lib/uptime-chart";
import type {
  InstatusComponent,
  InstatusComponentsResponse,
  InstatusComponentsUptime,
  InstatusOutage,
  InstatusSummary,
  InstatusSummaryIncident,
} from "@/adapters/instatus/types";

const NO_UPTIME: InstatusComponentsUptime = {};

function summaryUrl(siteUrl: string): string {
  return `${getOrigin(normalizeSiteUrl(siteUrl))}/summary.json`;
}

function componentsUrl(siteUrl: string): string {
  return `${getOrigin(normalizeSiteUrl(siteUrl))}/v2/components.json`;
}

function isInstatusSummary(data: unknown): data is InstatusSummary {
  return (
    typeof data === "object" &&
    data !== null &&
    "page" in data &&
    typeof data.page === "object" &&
    data.page !== null &&
    "status" in data.page &&
    typeof data.page.status === "string" &&
    "name" in data.page
  );
}

function componentStatusValue(status: string): ComponentStatusValue | string {
  switch (status) {
    case "OPERATIONAL":
      return "operational";
    case "DEGRADEDPERFORMANCE":
      return "degraded_performance";
    case "PARTIALOUTAGE":
      return "partial_outage";
    case "MINOROUTAGE":
      return "partial_outage";
    case "MAJOROUTAGE":
      return "major_outage";
    case "UNDERMAINTENANCE":
      return "under_maintenance";
    default:
      return status.toLowerCase();
  }
}

function impactToIndicator(impact: string): StatusIndicator {
  switch (impact) {
    case "MAJOROUTAGE":
      return "critical";
    case "PARTIALOUTAGE":
      return "major";
    case "MINOROUTAGE":
    case "DEGRADEDPERFORMANCE":
      return "minor";
    default:
      return "minor";
  }
}

function impactToIncidentImpact(impact: string): string {
  switch (impact) {
    case "MAJOROUTAGE":
      return "critical";
    case "PARTIALOUTAGE":
      return "major";
    case "MINOROUTAGE":
    case "DEGRADEDPERFORMANCE":
      return "minor";
    default:
      return "minor";
  }
}

function componentStatusToIndicator(status: string): StatusIndicator {
  switch (status) {
    case "OPERATIONAL":
      return "none";
    case "DEGRADEDPERFORMANCE":
    case "UNDERMAINTENANCE":
      return "minor";
    case "PARTIALOUTAGE":
    case "MINOROUTAGE":
      return "major";
    case "MAJOROUTAGE":
      return "critical";
    default:
      return "minor";
  }
}

/**
 * Instatus lists group containers alongside regular components (children
 * reference them via `group.id`), so drop any entry acting as a group.
 */
function leafComponents(components: InstatusComponent[]): InstatusComponent[] {
  const groupIds = new Set(
    components
      .map((component) => component.group?.id)
      .filter((id): id is string => Boolean(id)),
  );

  return components.filter((component) => !groupIds.has(component.id));
}

function outageStatusToDayLevel(status: string): DayStatus["level"] | null {
  switch (status) {
    case "DEGRADEDPERFORMANCE":
    case "UNDERMAINTENANCE":
      return "degraded";
    case "MINOROUTAGE":
    case "PARTIALOUTAGE":
      return "partial";
    case "MAJOROUTAGE":
      return "major";
    default:
      // OPERATIONAL entries mark recovery windows, not downtime.
      return null;
  }
}

function buildHistoryFromOutages(outages: InstatusOutage[]): DayStatus[] {
  return buildDayHistory(
    outages.flatMap((outage): DaySpan[] => {
      const level = outageStatusToDayLevel(outage.status);
      return level
        ? [
            {
              start: new Date(outage.from),
              end: outage.to ? new Date(outage.to) : new Date(),
              level,
            },
          ]
        : [];
    }),
  );
}

/**
 * Instatus has no public endpoint for uptime history; the data is embedded in
 * the status page HTML as Next.js flight data (`self.__next_f.push` chunks)
 * under a `componentsUptime` key. Best effort: returns {} when unavailable.
 */
async function fetchComponentsUptime(
  siteUrl: string,
): Promise<InstatusComponentsUptime> {
  try {
    const response = await fetch(siteUrl, {
      headers: { Accept: "text/html" },
    });

    if (!response.ok) {
      return {};
    }

    const html = await response.text();
    const chunks = html.matchAll(
      /self\.__next_f\.push\(\[1,\s*"((?:[^"\\]|\\.)*)"\]\)/g,
    );

    let payload = "";
    for (const match of chunks) {
      try {
        payload += JSON.parse(`"${match[1]}"`);
      } catch {
        // Skip chunks that fail to unescape.
      }
    }

    const marker = '"componentsUptime":';
    const markerIndex = payload.indexOf(marker);
    if (markerIndex === -1) {
      return {};
    }

    const openIndex = payload.indexOf("{", markerIndex + marker.length);
    if (openIndex === -1) {
      return {};
    }

    const objectText = extractBalancedObject(payload, openIndex);
    if (!objectText) {
      return {};
    }

    return JSON.parse(objectText) as InstatusComponentsUptime;
  } catch {
    return {};
  }
}

function incidentKey(incident: InstatusSummaryIncident): string {
  return incident.id ?? incident.url ?? incident.name;
}

function affectedComponentIds(
  incident: InstatusSummaryIncident,
  components: InstatusComponent[],
): string[] | undefined {
  const key = incidentKey(incident);
  const ids = components
    .filter((component) =>
      component.activeIncidents?.some((active) => incidentKey(active) === key),
    )
    .map((component) => component.id);

  return ids.length > 0 ? ids : undefined;
}

function mapIncidents(
  summary: InstatusSummary,
  components: InstatusComponent[],
): StatusIncident[] {
  const incidents = (summary.activeIncidents ?? []).map((incident) => ({
    id: incidentKey(incident),
    name: incident.name,
    status: incident.status.toLowerCase(),
    impact: impactToIncidentImpact(incident.impact),
    updatedAt: incident.updatedAt ?? incident.started,
    affectedComponentIds: affectedComponentIds(incident, components),
  }));

  const maintenances = (summary.activeMaintenances ?? [])
    .filter((maintenance) => maintenance.status === "INPROGRESS")
    .map((maintenance) => ({
      id: maintenance.id ?? maintenance.url ?? maintenance.name,
      name: maintenance.name,
      status: "maintenance",
      impact: "minor",
      updatedAt: maintenance.updatedAt ?? maintenance.start,
    }));

  return [...incidents, ...maintenances];
}

function computeIndicator(
  summary: InstatusSummary,
  components: InstatusComponent[],
): StatusIndicator {
  if (summary.page.status === "UP") {
    return "none";
  }

  const fromIncidents = (summary.activeIncidents ?? []).map((incident) =>
    impactToIndicator(incident.impact),
  );
  const fromComponents = components.map((component) =>
    componentStatusToIndicator(component.status),
  );
  const worst = worstIndicator([...fromIncidents, ...fromComponents]);

  return worst === "none" ? "minor" : worst;
}

export const instatusAdapter: StatusAdapter = {
  async detect(siteUrl: string): Promise<boolean> {
    const data = await fetchJson<unknown>(summaryUrl(siteUrl));
    return isInstatusSummary(data);
  },

  async fetchSnapshot(input: AdapterFetchInput): Promise<StatusSnapshot> {
    const normalized = normalizeSiteUrl(input.url);
    const fetchedAt = new Date().toISOString();

    const [summary, componentsResponse, componentsUptime] = await Promise.all([
      fetchJson<InstatusSummary>(summaryUrl(normalized)),
      fetchJson<InstatusComponentsResponse>(componentsUrl(normalized)).catch(
        () => ({ components: [] as InstatusComponent[] }),
      ),
      input.includeHistory ? fetchComponentsUptime(normalized) : NO_UPTIME,
    ]);

    const allComponents = componentsResponse.components ?? [];
    const components: ComponentStatus[] = leafComponents(allComponents).map(
      (component) => {
        const uptimeInfo = componentsUptime[component.id];
        const uptime = uptimeInfo?.uptime
          ? parseFloat(uptimeInfo.uptime)
          : undefined;

        return {
          id: component.id,
          name: component.name,
          status: componentStatusValue(component.status),
          uptimePercent:
            uptime !== undefined && !Number.isNaN(uptime) ? uptime : undefined,
          historyDays: uptimeInfo
            ? buildHistoryFromOutages(uptimeInfo.outages ?? [])
            : undefined,
        };
      },
    );

    const incidents = mapIncidents(summary, allComponents);
    const indicator = computeIndicator(summary, allComponents);

    const overall =
      summary.page.status === "UNDERMAINTENANCE" && incidents.length === 0
        ? "Under Maintenance"
        : overallDescription(indicator, incidents.length);

    return {
      pageName: summary.page.name,
      pageUrl: summary.page.url || normalized,
      overallDescription: overall,
      indicator,
      components,
      incidents,
      historyDays: buildPageHistoryFromComponents(components),
      uptimePercent: averageComponentUptime(components),
      fetchedAt,
    };
  },
};
