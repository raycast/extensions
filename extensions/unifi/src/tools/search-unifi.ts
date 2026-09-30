import { UniFiClient } from "../api/client";
import { resolveNetworkSite } from "../api/sites";
import type { JsonObject } from "../api/types";

type Input = {
  /** Maximum number of matches to return, from 1 to 50. Defaults to 20. */
  limit?: number;
  /** Search text matched against names, IP addresses, MAC addresses, models, types, states, and IDs. */
  query: string;
  /** Where to search. Defaults to both Network and Protect. */
  scope?: "all" | "network" | "protect";
  /** Optional Network site ID, name, or internal reference. Omit to use the selected site. */
  site?: string;
};

function matches(item: object, query: string): boolean {
  const record = item as Record<string, unknown>;
  return ["id", "name", "ipAddress", "macAddress", "mac", "model", "modelKey", "type", "state"]
    .map((key) => record[key])
    .some((value) => typeof value === "string" && value.toLowerCase().includes(query));
}

/** Search current UniFi Network and Protect inventory. */
export default async function searchUniFi(input: Input) {
  const query = input.query.trim().toLowerCase();
  if (!query) throw new Error("A non-empty search query is required.");
  const limit = Math.max(1, Math.min(50, Number.isFinite(input.limit) ? Math.trunc(input.limit as number) : 20));
  const scope = input.scope ?? "all";
  const client = UniFiClient.fromPreferences();
  const results: Array<JsonObject & { source: string }> = [];
  const unavailable: Array<{ reason: string; scope: "network" | "protect" }> = [];

  if (scope !== "protect") {
    try {
      const site = await resolveNetworkSite(client, input.site);
      const [devices, clients] = await Promise.all([client.listDevices(site.id), client.listClients(site.id)]);
      results.push(
        ...devices.filter((item) => matches(item, query)).map((item) => ({ ...item, source: "network-device" })),
        ...clients.filter((item) => matches(item, query)).map((item) => ({ ...item, source: "network-client" })),
      );
    } catch (error) {
      if (scope === "network") throw error;
      unavailable.push({
        reason: error instanceof Error ? error.message : "Network search is unavailable.",
        scope: "network",
      });
    }
  }

  if (scope !== "network") {
    try {
      const protect = await client.getProtectOverview();
      for (const [resource, items] of Object.entries(protect.collections)) {
        results.push(...items.filter((item) => matches(item, query)).map((item) => ({ ...item, source: resource })));
      }
      unavailable.push(
        ...protect.unavailable.map(({ reason, resource }) => ({
          reason: `${resource}: ${reason}`,
          scope: "protect" as const,
        })),
      );
    } catch (error) {
      if (scope === "protect") throw error;
      unavailable.push({
        reason: error instanceof Error ? error.message : "Protect search is unavailable.",
        scope: "protect",
      });
    }
  }

  return {
    matches: results.slice(0, limit),
    totalMatches: results.length,
    truncated: results.length > limit,
    unavailable,
  };
}
