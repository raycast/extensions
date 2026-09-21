import { UniFiClient } from "../api/client";
import { resolveNetworkSite } from "../api/sites";
import { summarizeUniFiHealth } from "../lib/health";

type Input = {
  /** Optional exact Network site ID, name, or internal reference. Omit to use the site selected in Raycast. */
  site?: string;
};

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/** Get a concise combined health check for UniFi Network and Protect. */
export default async function getUniFiHealth(input: Input) {
  const client = UniFiClient.fromPreferences();
  const [networkResult, protectResult] = await Promise.allSettled([
    resolveNetworkSite(client, input.site).then((site) => client.getNetworkOverview(site)),
    client.getProtectOverview(),
  ]);
  const network = networkResult.status === "fulfilled" ? networkResult.value : undefined;
  const protect = protectResult.status === "fulfilled" ? protectResult.value : undefined;

  return {
    health: summarizeUniFiHealth(network, protect),
    site: network?.site,
    unavailable: [
      ...(networkResult.status === "rejected"
        ? [{ service: "network", reason: errorMessage(networkResult.reason, "Network is unavailable.") }]
        : []),
      ...(protectResult.status === "rejected"
        ? [{ service: "protect", reason: errorMessage(protectResult.reason, "Protect is unavailable.") }]
        : []),
      ...(network?.unavailable.map(({ resource, reason }) => ({ service: resource, reason })) ?? []),
      ...(protect?.unavailable.map(({ resource, reason }) => ({ service: resource, reason })) ?? []),
    ],
  };
}
