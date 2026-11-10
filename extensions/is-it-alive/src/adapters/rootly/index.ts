import type {
  FetchSnapshotInput,
  StatusAdapter,
  StatusIncident,
  StatusIndicator,
  StatusSnapshot,
} from "@/types";
import { fetchJson } from "@/lib/fetch-json";
import { getOrigin, normalizeSiteUrl } from "@/lib/url";
import type {
  RootlyIncident,
  RootlyStatusResponse,
} from "@/adapters/rootly/types";

/**
 * Rootly pages often sit behind a Cloudflare bot challenge, but the public
 * JSON API is exempt. It reports status and incidents only, no components.
 */
function statusUrl(siteUrl: string): string {
  return `${getOrigin(normalizeSiteUrl(siteUrl))}/api/v1/status.json`;
}

function isRootlyStatus(data: unknown): data is RootlyStatusResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "page" in data &&
    typeof data.page === "object" &&
    data.page !== null &&
    "name" in data.page &&
    "status" in data &&
    typeof data.status === "object" &&
    data.status !== null &&
    "indicator" in data.status
  );
}

function toIndicator(indicator: string): StatusIndicator {
  switch (indicator) {
    case "none":
      return "none";
    case "major":
      return "major";
    case "minor":
    case "maintenance":
    default:
      return "minor";
  }
}

function mapIncident(incident: RootlyIncident): StatusIncident {
  const latest = incident.incident_updates?.[0];
  return {
    id: incident.url,
    name: incident.name,
    status: latest?.status ?? incident.status,
    impact: incident.impact,
    updatedAt: latest?.created_at ?? incident.started_at,
    body: latest?.body,
  };
}

export const rootlyAdapter: StatusAdapter = {
  async detect(siteUrl: string): Promise<boolean> {
    return isRootlyStatus(await fetchJson<unknown>(statusUrl(siteUrl)));
  },

  async fetchSnapshot(input: FetchSnapshotInput): Promise<StatusSnapshot> {
    const normalized = normalizeSiteUrl(input.url);
    const data = await fetchJson<RootlyStatusResponse>(statusUrl(normalized));

    return {
      pageName: data.page.name,
      pageUrl: data.page.url || normalized,
      overallDescription: data.status.description,
      indicator: toIndicator(data.status.indicator),
      components: [],
      incidents: (data.incidents ?? []).map(mapIncident),
      fetchedAt: new Date().toISOString(),
    };
  },
};
