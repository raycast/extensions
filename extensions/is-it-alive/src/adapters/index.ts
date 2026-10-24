import type {
  FetchSnapshotInput,
  SiteProvider,
  StatusAdapter,
  StatusSnapshot,
} from "@/types";
import { compactSnapshotForList } from "@/lib/snapshot-compact";
import { mapPool } from "@/lib/async-pool";
import { applyRegionFilter } from "@/lib/regions";
import { normalizeSiteUrl } from "@/lib/url";
import { aiStudioAdapter } from "@/adapters/aistudio";
import { awsAdapter } from "@/adapters/aws";
import { betterstackAdapter } from "@/adapters/betterstack";
import { checklyAdapter } from "@/adapters/checkly";
import { datadogAdapter } from "@/adapters/datadog";
import { firehydrantAdapter } from "@/adapters/firehydrant";
import { googleCloudAdapter } from "@/adapters/googlecloud";
import { incidentIoAdapter } from "@/adapters/incident-io";
import { instatusAdapter } from "@/adapters/instatus";
import { onlineornotAdapter } from "@/adapters/onlineornot";
import { outagedeckAdapter } from "@/adapters/outagedeck";
import { railwayAdapter } from "@/adapters/railway";
import { rootlyAdapter } from "@/adapters/rootly";
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
  googlecloud: googleCloudAdapter,
  aistudio: aiStudioAdapter,
  outagedeck: outagedeckAdapter,
  onlineornot: onlineornotAdapter,
  firehydrant: firehydrantAdapter,
  rootly: rootlyAdapter,
  datadog: datadogAdapter,
};

/**
 * Hostname matches first (no network), then platform probes. Datadog must
 * precede OnlineOrNot, which may still know a page's old custom domain.
 * RSS is the last resort.
 */
const DETECTION_ORDER: SiteProvider[] = [
  "railway",
  "outagedeck",
  "aws",
  "salesforce",
  "googlecloud",
  "aistudio",
  "incidentio",
  "betterstack",
  "instatus",
  "statuspage",
  "rootly",
  "datadog",
  "onlineornot",
  "firehydrant",
  "checkly",
  "uptimecom",
  "rss",
];

export async function detectProvider(siteUrl: string): Promise<SiteProvider> {
  const normalized = normalizeSiteUrl(siteUrl);

  for (const provider of DETECTION_ORDER) {
    const detected = await adapters[provider]
      .detect?.(normalized)
      .catch(() => false);
    if (detected) {
      return provider;
    }
  }

  throw new Error(
    "This URL does not match a supported status page or RSS feed.",
  );
}

type SiteToFetch = FetchSnapshotInput & { provider: SiteProvider };

async function loadSnapshot(
  site: SiteToFetch,
  includeHistory: boolean,
): Promise<StatusSnapshot> {
  const fetchedAt = new Date().toISOString();

  try {
    const snapshot = await adapters[site.provider].fetchSnapshot({
      ...site,
      includeHistory,
    });
    return applyRegionFilter(snapshot, site.monitoredRegions, site.provider);
  } catch (error) {
    return {
      pageName: new URL(site.url).hostname,
      pageUrl: site.url,
      overallDescription: "Failed to fetch",
      indicator: "none",
      components: [],
      incidents: [],
      fetchedAt,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/** Full snapshot with components, day history, and uptime. */
export function fetchSnapshot(site: SiteToFetch): Promise<StatusSnapshot> {
  return loadSnapshot(site, true);
}

/** Overall status and active incidents only. */
export function fetchStatus(site: SiteToFetch): Promise<StatusSnapshot> {
  return loadSnapshot(site, false);
}

/**
 * Status pages change platforms (Mistral moved from Checkly to Rootly), so a
 * failed saved provider gets one detection pass.
 */
async function fetchStatusOrRedetect(
  site: SiteToFetch,
): Promise<StatusSnapshot> {
  const snapshot = await fetchStatus(site);
  if (!snapshot.error) {
    return snapshot;
  }

  // ponytail: a site that is really down runs detection on every refresh (up to ~17 probe requests). Add a cooldown if that shows up as load.
  const provider = await detectProvider(site.url).catch(() => site.provider);
  if (provider === site.provider) {
    return snapshot;
  }

  const retried = await fetchStatus({ ...site, provider });
  return retried.error
    ? snapshot
    : { ...retried, redetectedProvider: provider };
}

export async function fetchAllSnapshots(
  sites: Array<SiteToFetch & { id: string }>,
): Promise<Record<string, StatusSnapshot>> {
  const entries = await mapPool(sites, 2, async (site) => {
    const snapshot = await fetchStatusOrRedetect(site);
    return [site.id, compactSnapshotForList(snapshot)] as const;
  });

  return Object.fromEntries(entries);
}
