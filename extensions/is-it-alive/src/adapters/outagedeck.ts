import type {
  ComponentStatusValue,
  FetchSnapshotInput,
  StatusAdapter,
  StatusIncident,
  StatusIndicator,
  StatusSnapshot,
} from "@/types";
import type {
  OutageDeckIncident,
  OutageDeckProviderResponse,
  OutageDeckService,
} from "@/types/outagedeck";
import { fetchJson } from "@/lib/fetch-json";
import { normalizeSiteUrl } from "@/lib/url";

const OUTAGEDECK_ORIGIN = "https://outagedeck.com";
const OUTAGEDECK_HOSTS = new Set(["outagedeck.com", "www.outagedeck.com"]);
const PROVIDER_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function providerSlug(siteUrl: string): string | null {
  const url = new URL(normalizeSiteUrl(siteUrl));
  if (!OUTAGEDECK_HOSTS.has(url.hostname)) {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  let encodedSlug: string | undefined;

  if (segments.length === 2 && segments[0] === "providers" && segments[1]) {
    encodedSlug = segments[1];
  } else if (
    segments.length === 4 &&
    segments[0] === "api" &&
    segments[1] === "v1" &&
    segments[2] === "providers" &&
    segments[3]
  ) {
    encodedSlug = segments[3];
  }

  if (!encodedSlug) {
    return null;
  }

  const slug = decodeURIComponent(encodedSlug);
  return PROVIDER_SLUG_PATTERN.test(slug) ? slug : null;
}

function statusToIndicator(status: string): StatusIndicator {
  switch (status) {
    case "operational":
      return "none";
    case "degraded":
    case "maintenance":
    case "unknown":
      return "minor";
    case "partial_outage":
      return "major";
    case "major_outage":
      return "critical";
    default:
      return "minor";
  }
}

function statusToComponent(status: string): ComponentStatusValue | string {
  switch (status) {
    case "operational":
      return "operational";
    case "degraded":
      return "degraded_performance";
    case "partial_outage":
      return "partial_outage";
    case "major_outage":
      return "major_outage";
    case "maintenance":
      return "under_maintenance";
    default:
      return "unknown";
  }
}

function mapIncident(
  incident: OutageDeckIncident,
  services: OutageDeckService[],
): StatusIncident {
  const componentIdsBySlug = new Map(
    services.map((service) => [service.slug, service.id]),
  );
  const affectedComponentIds = (incident.affectedServices ?? [])
    .map((service) => componentIdsBySlug.get(service.slug))
    .filter((id): id is string => Boolean(id));

  return {
    id: incident.id,
    name: incident.title,
    status: incident.status,
    impact: incident.severity,
    updatedAt: incident.updatedAt || incident.startedAt,
    body: incident.summary,
    affectedComponentIds:
      affectedComponentIds.length > 0 ? affectedComponentIds : undefined,
  };
}

export const outagedeckAdapter: StatusAdapter = {
  async detect(siteUrl: string): Promise<boolean> {
    try {
      return providerSlug(siteUrl) !== null;
    } catch {
      return false;
    }
  },

  async fetchSnapshot(input: FetchSnapshotInput): Promise<StatusSnapshot> {
    const normalized = normalizeSiteUrl(input.url);
    const fetchedAt = new Date().toISOString();

    try {
      const slug = providerSlug(normalized);
      if (!slug) {
        throw new Error("Not an OutageDeck provider URL");
      }

      const response = await fetchJson<OutageDeckProviderResponse>(
        `${OUTAGEDECK_ORIGIN}/api/v1/providers/${encodeURIComponent(slug)}`,
      );
      const { data } = response;
      if (!data?.currentStatus || !data.name) {
        throw new Error("Invalid OutageDeck provider response");
      }

      const services = data.services ?? [];
      const pageUrl = data.links?.html
        ? new URL(data.links.html, OUTAGEDECK_ORIGIN).toString()
        : normalized;

      return {
        pageName: data.name,
        pageUrl,
        overallDescription: data.currentStatus.headline,
        indicator: statusToIndicator(data.currentStatus.code),
        components: services.map((service) => ({
          id: service.id,
          name: service.name,
          status: statusToComponent(service.status),
        })),
        incidents: (data.activeIncidents ?? []).map((incident) =>
          mapIncident(incident, services),
        ),
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
