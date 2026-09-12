import type {
  ComponentStatusValue,
  FetchSnapshotInput,
  StatusAdapter,
  StatusIncident,
  StatusIndicator,
  StatusSnapshot,
} from "@/types";
import type {
  OnlineOrNotComponent,
  OnlineOrNotComponentStatus,
  OnlineOrNotIncident,
  OnlineOrNotSummary,
} from "@/types/onlineornot";
import { fetchJson } from "@/lib/fetch-json";
import { overallDescription } from "@/lib/snapshot-text";
import { normalizeSiteUrl } from "@/lib/url";

const API_ORIGIN = "https://api.onlineornot.com";
const HOSTED_SUFFIX = ".onlineornot.com";
const MARKETING_HOSTS = new Set([
  "onlineornot.com",
  "www.onlineornot.com",
  "api.onlineornot.com",
  "developers.onlineornot.com",
  "dashboard.onlineornot.com",
  "metadata.onlineornot.com",
  "img.onlineornot.com",
]);
function hostedSubdomain(siteUrl: string): string | null {
  const hostname = new URL(normalizeSiteUrl(siteUrl)).hostname.toLowerCase();
  if (!hostname.endsWith(HOSTED_SUFFIX)) {
    return null;
  }

  const subdomain = hostname.slice(0, -HOSTED_SUFFIX.length);
  if (!subdomain || subdomain.includes(".") || MARKETING_HOSTS.has(hostname)) {
    return null;
  }

  return subdomain;
}

function summaryUrl(lookupKey: string): string {
  return `${API_ORIGIN}/v1/status_pages/${encodeURIComponent(lookupKey)}/summary`;
}

function isOnlineOrNotSummary(data: unknown): data is OnlineOrNotSummary {
  if (typeof data !== "object" || data === null || !("result" in data)) {
    return false;
  }

  const result = data.result;
  if (typeof result !== "object" || result === null) {
    return false;
  }

  if (!("status_page" in result) || typeof result.status_page !== "object") {
    return false;
  }

  const statusPage = result.status_page;
  return (
    statusPage !== null &&
    "name" in statusPage &&
    typeof statusPage.name === "string" &&
    "subdomain" in statusPage &&
    typeof statusPage.subdomain === "string"
  );
}

function summaryLookupKey(siteUrl: string): string | null {
  const hosted = hostedSubdomain(siteUrl);
  if (hosted) {
    return hosted;
  }

  const hostname = new URL(normalizeSiteUrl(siteUrl)).hostname.toLowerCase();
  if (MARKETING_HOSTS.has(hostname)) {
    return null;
  }

  return hostname;
}

async function fetchSummary(
  siteUrl: string,
): Promise<OnlineOrNotSummary | null> {
  const key = summaryLookupKey(siteUrl);
  if (!key) {
    return null;
  }

  try {
    const data = await fetchJson<unknown>(summaryUrl(key));
    return isOnlineOrNotSummary(data) ? data : null;
  } catch {
    return null;
  }
}

function componentStatus(
  status: OnlineOrNotComponentStatus | string,
): ComponentStatusValue | string {
  switch (status) {
    case "OPERATIONAL":
      return "operational";
    case "DEGRADED_PERFORMANCE":
      return "degraded_performance";
    case "PARTIAL_OUTAGE":
      return "partial_outage";
    case "MAJOR_OUTAGE":
      return "major_outage";
    case "UNDER_MAINTENANCE":
      return "under_maintenance";
    default:
      return status.toLowerCase();
  }
}

function componentIndicator(
  status: OnlineOrNotComponentStatus | string,
): StatusIndicator {
  switch (status) {
    case "OPERATIONAL":
      return "none";
    case "DEGRADED_PERFORMANCE":
    case "UNDER_MAINTENANCE":
      return "minor";
    case "PARTIAL_OUTAGE":
      return "major";
    case "MAJOR_OUTAGE":
      return "critical";
    default:
      return "minor";
  }
}

function impactToIncidentImpact(impact: string | null | undefined): string {
  switch (impact) {
    case "MAJOR_OUTAGE":
      return "critical";
    case "PARTIAL_OUTAGE":
      return "major";
    case "DEGRADED_PERFORMANCE":
      return "minor";
    case "UNDER_MAINTENANCE":
      return "maintenance";
    default:
      return impact?.toLowerCase() ?? "minor";
  }
}

function worseIndicator(
  current: StatusIndicator,
  next: StatusIndicator,
): StatusIndicator {
  const order: StatusIndicator[] = ["none", "minor", "major", "critical"];
  return order.indexOf(next) > order.indexOf(current) ? next : current;
}

function indicatorFromComponents(
  components: OnlineOrNotComponent[],
): StatusIndicator {
  return components.reduce<StatusIndicator>(
    (worst, component) =>
      worseIndicator(worst, componentIndicator(component.status)),
    "none",
  );
}

function mapIncident(incident: OnlineOrNotIncident): StatusIncident {
  return {
    id: incident.id,
    name: incident.title,
    status: incident.ended ? "resolved" : "active",
    impact: impactToIncidentImpact(incident.impact),
    updatedAt: incident.updated_at || incident.created_at || incident.started,
  };
}

function pageUrlFromSummary(
  statusPage: OnlineOrNotSummary["result"]["status_page"],
  fallback: string,
): string {
  const custom = statusPage.custom_domain?.trim();
  if (custom) {
    return /^https?:\/\//i.test(custom)
      ? custom.replace(/\/+$/, "")
      : `https://${custom}`;
  }

  if (statusPage.subdomain) {
    return `https://${statusPage.subdomain}.onlineornot.com`;
  }

  return fallback;
}

export const onlineornotAdapter: StatusAdapter = {
  async detect(siteUrl: string): Promise<boolean> {
    try {
      if (hostedSubdomain(siteUrl)) {
        return true;
      }

      return (await fetchSummary(siteUrl)) !== null;
    } catch {
      return false;
    }
  },

  async fetchSnapshot(input: FetchSnapshotInput): Promise<StatusSnapshot> {
    const normalized = normalizeSiteUrl(input.url);
    const fetchedAt = new Date().toISOString();

    try {
      const data = await fetchSummary(normalized);
      if (!data?.result.status_page.name) {
        throw new Error("Invalid OnlineOrNot status page response");
      }

      const components = data.result.components ?? [];
      const incidents = (data.result.active_incidents ?? []).map(mapIncident);
      const indicator = indicatorFromComponents(components);
      const description =
        data.result.status?.description?.trim() ||
        overallDescription(indicator, incidents.length);

      return {
        pageName: data.result.status_page.name,
        pageUrl: pageUrlFromSummary(data.result.status_page, normalized),
        overallDescription: description,
        indicator,
        components: components.map((component) => ({
          id: component.id,
          name: component.name,
          status: componentStatus(component.status),
        })),
        incidents,
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
