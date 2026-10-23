import type {
  AdapterFetchInput,
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
import { buildDayHistory } from "@/lib/day-history";
import {
  averageComponentUptime,
  buildPageHistoryFromComponents,
} from "@/lib/uptime-chart";
import type {
  IncidentIoImpactStatus,
  IncidentIoComponentImpact,
  IncidentIoComponentUptime,
  IncidentIoIncident,
  ComponentImpactsResponse,
} from "@/adapters/incident-io/types";

const STATUS_SEVERITY: Record<IncidentIoImpactStatus, number> = {
  operational: 0,
  degraded_performance: 1,
  partial_outage: 2,
  full_outage: 3,
};

function proxyBase(siteUrl: string): string {
  const normalized = normalizeSiteUrl(siteUrl);
  const origin = getOrigin(normalized);
  const hostname = new URL(normalized).hostname;
  return `${origin}/proxy/${hostname}`;
}

async function discardBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // Some test and runtime response bodies do not support cancellation.
  }
}

async function redirectedOrigin(siteUrl: string): Promise<string | null> {
  try {
    const response = await fetch(siteUrl, {
      method: "GET",
      redirect: "manual",
      headers: { Accept: "text/html" },
    });
    await discardBody(response);

    if (response.status < 300 || response.status >= 400) {
      return null;
    }

    const location = response.headers.get("location");
    if (!location) {
      return null;
    }

    return normalizeSiteUrl(new URL(location, siteUrl).origin);
  } catch {
    return null;
  }
}

async function isIncidentIoSite(siteUrl: string): Promise<boolean> {
  try {
    // A 1-day window keeps this platform check small.
    const data = await fetchJson<ComponentImpactsResponse>(
      componentImpactsUrl(proxyBase(siteUrl), 1),
    );
    return Array.isArray(data.component_impacts);
  } catch {
    return false;
  }
}

async function resolveIncidentIoSiteUrl(
  siteUrl: string,
): Promise<string | null> {
  const normalized = normalizeSiteUrl(siteUrl);
  if (await isIncidentIoSite(normalized)) {
    return normalized;
  }

  const redirected = await redirectedOrigin(normalized);
  if (
    redirected &&
    redirected !== normalized &&
    (await isIncidentIoSite(redirected))
  ) {
    return redirected;
  }

  return null;
}

function impactToDayLevel(status: IncidentIoImpactStatus): DayStatus["level"] {
  switch (status) {
    case "operational":
      return "operational";
    case "degraded_performance":
      return "degraded";
    case "partial_outage":
      return "partial";
    case "full_outage":
      return "major";
    default:
      return "degraded";
  }
}

function normalizeComponentStatus(
  status: IncidentIoImpactStatus | string,
): ComponentStatusValue | string {
  if (status === "full_outage") {
    return "major_outage";
  }

  return status;
}

function statusToIndicator(
  status: IncidentIoImpactStatus | string,
): StatusIndicator {
  switch (status) {
    case "operational":
      return "none";
    case "degraded_performance":
      return "minor";
    case "partial_outage":
      return "major";
    case "full_outage":
      return "critical";
    default:
      return "minor";
  }
}

function impactToIncidentImpact(status: IncidentIoImpactStatus): string {
  switch (status) {
    case "operational":
      return "none";
    case "degraded_performance":
      return "minor";
    case "partial_outage":
      return "major";
    case "full_outage":
      return "critical";
    default:
      return "minor";
  }
}

function worstStatus(
  statuses: Array<IncidentIoImpactStatus | string>,
): IncidentIoImpactStatus {
  let worst: IncidentIoImpactStatus = "operational";

  for (const status of statuses) {
    const normalized = status as IncidentIoImpactStatus;
    if (STATUS_SEVERITY[normalized] > STATUS_SEVERITY[worst]) {
      worst = normalized;
    }
  }

  return worst;
}

const ACTIVE_INCIDENT_STATUSES = new Set([
  "investigating",
  "identified",
  "monitoring",
  "in_progress",
  "update",
]);

function isActiveIncident(status: string): boolean {
  return ACTIVE_INCIDENT_STATUSES.has(status);
}

function componentImpactsUrl(proxy: string, days = 90): string {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const start = new Date(end);
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const params = new URLSearchParams({
    start_at: start.toISOString(),
    end_at: end.toISOString(),
  });

  return `${proxy}/component_impacts?${params.toString()}`;
}

function parseComponentCatalog(html: string): Map<string, string> {
  const catalog = new Map<string, string>();
  const pattern =
    /\\"id\\":\\"([A-Za-z0-9_-]+)\\",\\"name\\":\\"([^\\"]+)\\",\\"status_page_id\\"/g;

  for (const match of html.matchAll(pattern)) {
    catalog.set(match[1], match[2]);
  }

  return catalog;
}

function parsePageTitle(html: string, fallback: string): string {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  if (!match) {
    return fallback;
  }

  return match[1].replace(/\s*Status\s*$/i, "").trim() || fallback;
}

async function fetchPageMetadata(
  siteUrl: string,
  fallbackName: string,
): Promise<{ catalog: Map<string, string>; pageName: string }> {
  try {
    const response = await fetch(siteUrl, {
      headers: { Accept: "text/html" },
    });

    if (!response.ok) {
      return { catalog: new Map(), pageName: fallbackName };
    }

    const pageHtml = await response.text();
    return {
      catalog: parseComponentCatalog(pageHtml),
      pageName: parsePageTitle(pageHtml, fallbackName),
    };
  } catch {
    return { catalog: new Map(), pageName: fallbackName };
  }
}

function buildHistoryFromImpacts(
  impacts: IncidentIoComponentImpact[],
  componentId: string,
): DayStatus[] {
  return buildDayHistory(
    impacts
      .filter((impact) => impact.component_id === componentId)
      .map((impact) => ({
        start: new Date(impact.start_at),
        end: impact.end_at ? new Date(impact.end_at) : new Date(),
        level: impactToDayLevel(impact.status),
      })),
  );
}

function mapIncidents(incidents: IncidentIoIncident[]): StatusIncident[] {
  return incidents
    .filter((incident) => isActiveIncident(incident.status))
    .map((incident) => {
      const affectedStatuses =
        incident.affected_components?.map((component) => component.status) ??
        [];
      const worst = worstStatus(affectedStatuses);
      const latestUpdate = incident.updates?.[0];

      return {
        id: incident.id,
        name: incident.name,
        status: incident.status,
        impact: impactToIncidentImpact(worst),
        updatedAt: latestUpdate?.published_at ?? incident.published_at,
        body: latestUpdate?.message_string,
        affectedComponentIds: incident.affected_components?.map(
          (component) => component.component_id,
        ),
      };
    });
}

function currentComponentStatuses(
  incidents: IncidentIoIncident[],
): Map<string, IncidentIoImpactStatus> {
  const statuses = new Map<string, IncidentIoImpactStatus>();

  for (const incident of incidents) {
    if (!isActiveIncident(incident.status)) {
      continue;
    }

    for (const component of incident.affected_components ?? []) {
      const current = component.current_status ?? component.status;
      const existing = statuses.get(component.component_id) ?? "operational";
      if (STATUS_SEVERITY[current] > STATUS_SEVERITY[existing]) {
        statuses.set(component.component_id, current);
      }
    }
  }

  return statuses;
}

function computeOverallIndicator(
  activeIncidents: StatusIncident[],
  liveStatuses: Map<string, IncidentIoImpactStatus>,
): StatusIndicator {
  if (activeIncidents.length === 0 && liveStatuses.size === 0) {
    return "none";
  }

  if (liveStatuses.size > 0) {
    return statusToIndicator(worstStatus([...liveStatuses.values()]));
  }

  return "minor";
}

export const incidentIoAdapter: StatusAdapter = {
  async detect(siteUrl: string): Promise<boolean> {
    return (await resolveIncidentIoSiteUrl(siteUrl)) !== null;
  },

  async fetchSnapshot(input: AdapterFetchInput): Promise<StatusSnapshot> {
    const normalized = normalizeSiteUrl(input.url);
    const canonical =
      (await resolveIncidentIoSiteUrl(normalized)) ?? normalized;
    const proxy = proxyBase(canonical);
    const hostname = new URL(canonical).hostname;
    const fetchedAt = new Date().toISOString();

    const [incidentsData, impactsData, pageMetadata] = await Promise.all([
      fetchJson<{ incidents: IncidentIoIncident[] }>(`${proxy}/incidents`),
      input.includeHistory
        ? fetchJson<ComponentImpactsResponse>(componentImpactsUrl(proxy))
        : null,
      input.includeHistory ? fetchPageMetadata(canonical, hostname) : null,
    ]);

    const incidents = incidentsData.incidents ?? [];
    const liveStatuses = currentComponentStatuses(incidents);
    const activeIncidents = mapIncidents(incidents);
    const indicator = computeOverallIndicator(activeIncidents, liveStatuses);
    const status = {
      pageUrl: canonical,
      overallDescription: overallDescription(indicator, activeIncidents.length),
      indicator,
      incidents: activeIncidents,
      fetchedAt,
    };

    if (!impactsData || !pageMetadata) {
      return { ...status, pageName: hostname, components: [] };
    }

    const { catalog, pageName } = pageMetadata;
    const componentImpacts = impactsData.component_impacts ?? [];
    const componentUptimes = impactsData.component_uptimes ?? [];

    const uptimeEntries = componentUptimes.filter(
      (entry): entry is IncidentIoComponentUptime & { component_id: string } =>
        Boolean(entry.component_id),
    );

    const components = uptimeEntries.map((entry) => {
      const status =
        liveStatuses.get(entry.component_id) ?? ("operational" as const);

      return {
        id: entry.component_id,
        name: catalog.get(entry.component_id) ?? entry.component_id,
        status: normalizeComponentStatus(status),
        uptimePercent: parseFloat(entry.uptime),
        historyDays: buildHistoryFromImpacts(
          componentImpacts,
          entry.component_id,
        ),
      };
    });

    components.sort((a, b) => a.name.localeCompare(b.name));

    return {
      ...status,
      pageName,
      components,
      historyDays: buildPageHistoryFromComponents(components),
      uptimePercent: averageComponentUptime(components),
    };
  },
};
