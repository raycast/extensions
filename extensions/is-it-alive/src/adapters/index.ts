import type { SiteProvider, StatusAdapter, StatusSnapshot } from "@/types";
import { isRailwayHost, normalizeSiteUrl } from "@/lib/url";
import { betterstackAdapter } from "@/adapters/betterstack";
import { incidentIoAdapter } from "@/adapters/incident-io";
import { railwayAdapter } from "@/adapters/railway";
import { statuspageAdapter } from "@/adapters/statuspage";

const adapters: Record<SiteProvider, StatusAdapter> = {
  statuspage: statuspageAdapter,
  railway: railwayAdapter,
  incidentio: incidentIoAdapter,
  betterstack: betterstackAdapter,
};

export function getAdapter(provider: SiteProvider): StatusAdapter {
  return adapters[provider];
}

export async function detectProvider(siteUrl: string): Promise<SiteProvider> {
  const normalized = normalizeSiteUrl(siteUrl);

  if (isRailwayHost(normalized)) {
    return "railway";
  }

  const isIncidentIo = await incidentIoAdapter.detect?.(normalized);
  if (isIncidentIo) {
    return "incidentio";
  }

  const isBetterStack = await betterstackAdapter.detect?.(normalized);
  if (isBetterStack) {
    return "betterstack";
  }

  const isStatuspage = await statuspageAdapter.detect?.(normalized);
  if (isStatuspage) {
    return "statuspage";
  }

  throw new Error(
    "Unsupported status page. Try Statuspage, Better Stack, incident.io, or status.railway.app",
  );
}

export async function fetchSnapshot(site: {
  url: string;
  provider: SiteProvider;
}): Promise<StatusSnapshot> {
  return getAdapter(site.provider).fetchSnapshot(site.url);
}

export async function fetchAllSnapshots(
  sites: Array<{ id: string; url: string; provider: SiteProvider }>,
): Promise<Record<string, StatusSnapshot>> {
  const entries = await Promise.all(
    sites.map(async (site) => {
      const snapshot = await fetchSnapshot(site);
      return [site.id, snapshot] as const;
    }),
  );

  return Object.fromEntries(entries);
}
