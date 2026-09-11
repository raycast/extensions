import type {
  FetchSnapshotInput,
  SiteProvider,
  StatusAdapter,
  StatusSnapshot,
} from "@/types";
import { compactSnapshotForList } from "@/lib/snapshot-compact";
import { mapPool } from "@/lib/async-pool";
import { applyRegionFilter } from "@/lib/regions";
import { isRailwayHost, normalizeSiteUrl } from "@/lib/url";
import { aiStudioAdapter } from "@/adapters/aistudio";
import { awsAdapter } from "@/adapters/aws";
import { betterstackAdapter } from "@/adapters/betterstack";
import { checklyAdapter } from "@/adapters/checkly";
import { firehydrantAdapter } from "@/adapters/firehydrant";
import { googleCloudAdapter } from "@/adapters/googlecloud";
import { incidentIoAdapter } from "@/adapters/incident-io";
import { instatusAdapter } from "@/adapters/instatus";
import { onlineornotAdapter } from "@/adapters/onlineornot";
import { outagedeckAdapter } from "@/adapters/outagedeck";
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
  googlecloud: googleCloudAdapter,
  aistudio: aiStudioAdapter,
  outagedeck: outagedeckAdapter,
  onlineornot: onlineornotAdapter,
  firehydrant: firehydrantAdapter,
};

export function getAdapter(provider: SiteProvider): StatusAdapter {
  return adapters[provider];
}

export async function detectProvider(siteUrl: string): Promise<SiteProvider> {
  const normalized = normalizeSiteUrl(siteUrl);

  if (isRailwayHost(normalized)) {
    return "railway";
  }

  const isOutageDeck = await outagedeckAdapter.detect?.(normalized);
  if (isOutageDeck) {
    return "outagedeck";
  }

  const isAws = await awsAdapter.detect?.(normalized);
  if (isAws) {
    return "aws";
  }

  const isSalesforce = await salesforceAdapter.detect?.(normalized);
  if (isSalesforce) {
    return "salesforce";
  }

  const isGoogleCloud = await googleCloudAdapter.detect?.(normalized);
  if (isGoogleCloud) {
    return "googlecloud";
  }

  const isAiStudio = await aiStudioAdapter.detect?.(normalized);
  if (isAiStudio) {
    return "aistudio";
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

  const isOnlineOrNot = await onlineornotAdapter.detect?.(normalized);
  if (isOnlineOrNot) {
    return "onlineornot";
  }

  const isFireHydrant = await firehydrantAdapter.detect?.(normalized);
  if (isFireHydrant) {
    return "firehydrant";
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
    "This URL does not match a supported status page or RSS feed.",
  );
}

export async function fetchSnapshot(
  site: FetchSnapshotInput & { provider: SiteProvider },
): Promise<StatusSnapshot> {
  const snapshot = await getAdapter(site.provider).fetchSnapshot(site);
  return applyRegionFilter(snapshot, site.monitoredRegions, site.provider);
}

export async function fetchAllSnapshots(
  sites: Array<FetchSnapshotInput & { id: string; provider: SiteProvider }>,
): Promise<Record<string, StatusSnapshot>> {
  const entries = await mapPool(sites, 2, async (site) => {
    const snapshot = await fetchSnapshot(site);
    return [site.id, compactSnapshotForList(snapshot)] as const;
  });

  return Object.fromEntries(entries);
}
