import type { SiteProvider, StatusAdapter, StatusSnapshot } from "@/types";
import { isRailwayHost, normalizeSiteUrl } from "@/lib/url";
import { awsAdapter } from "@/adapters/aws";
import { betterstackAdapter } from "@/adapters/betterstack";
import { checklyAdapter } from "@/adapters/checkly";
import { incidentIoAdapter } from "@/adapters/incident-io";
import { instatusAdapter } from "@/adapters/instatus";
import { railwayAdapter } from "@/adapters/railway";
import { rssAdapter } from "@/adapters/rss";
import { salesforceAdapter } from "@/adapters/salesforce";
import { statuspageAdapter } from "@/adapters/statuspage";
import { uptimecomAdapter } from "@/adapters/uptimecom";

const adapters: Record<SiteProvider, StatusAdapter> = {
  statuspage: statuspageAdapter,
  railway: railwayAdapter,
  incidentio: incidentIoAdapter,
  betterstack: betterstackAdapter,
  instatus: instatusAdapter,
  checkly: checklyAdapter,
  rss: rssAdapter,
  aws: awsAdapter,
  // status.heroku.com moved to Salesforce Trust; legacy sites keep working.
  heroku: salesforceAdapter,
  salesforce: salesforceAdapter,
  uptimecom: uptimecomAdapter,
};

export function getAdapter(provider: SiteProvider): StatusAdapter {
  return adapters[provider];
}

export async function detectProvider(siteUrl: string): Promise<SiteProvider> {
  const normalized = normalizeSiteUrl(siteUrl);

  if (isRailwayHost(normalized)) {
    return "railway";
  }

  const isAws = await awsAdapter.detect?.(normalized);
  if (isAws) {
    return "aws";
  }

  const isSalesforce = await salesforceAdapter.detect?.(normalized);
  if (isSalesforce) {
    return "salesforce";
  }

  const isIncidentIo = await incidentIoAdapter.detect?.(normalized);
  if (isIncidentIo) {
    return "incidentio";
  }

  const isBetterStack = await betterstackAdapter.detect?.(normalized);
  if (isBetterStack) {
    return "betterstack";
  }

  const isInstatus = await instatusAdapter.detect?.(normalized);
  if (isInstatus) {
    return "instatus";
  }

  const isStatuspage = await statuspageAdapter.detect?.(normalized);
  if (isStatuspage) {
    return "statuspage";
  }

  const isCheckly = await checklyAdapter.detect?.(normalized);
  if (isCheckly) {
    return "checkly";
  }

  const isUptimeCom = await uptimecomAdapter.detect?.(normalized);
  if (isUptimeCom) {
    return "uptimecom";
  }

  const isRss = await rssAdapter.detect?.(normalized);
  if (isRss) {
    return "rss";
  }

  throw new Error(
    "Unsupported status page. Try Statuspage, Better Stack, incident.io, Instatus, Checkly, an RSS status feed, or status.railway.app",
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
