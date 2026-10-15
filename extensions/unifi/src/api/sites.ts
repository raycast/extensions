import type { Site } from "./types";
import type { UniFiClient } from "./client";
import { getSelectedSite } from "./preferences";

export async function resolveNetworkSite(client: UniFiClient, requestedSite?: string): Promise<Site> {
  const requested = requestedSite?.trim();
  if (!requested) {
    const selected = await getSelectedSite();
    if (selected) return selected;
    throw new Error("No Network site is selected. Use the Select Site command or provide a site ID.");
  }

  const sites = await client.listSites();
  const normalized = requested.toLowerCase();
  const site = sites.find(
    (candidate) =>
      candidate.id === requested ||
      candidate.name.toLowerCase() === normalized ||
      candidate.internalReference.toLowerCase() === normalized,
  );
  if (!site) throw new Error(`Network site not found: ${requested}`);
  return site;
}
