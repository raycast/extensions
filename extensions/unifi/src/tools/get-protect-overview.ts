import { UniFiClient } from "../api/client";

/** Get status for the NVR and all supported UniFi Protect device categories. */
export default async function getProtectOverview() {
  const overview = await UniFiClient.fromPreferences().getProtectOverview();
  return {
    collections: Object.fromEntries(
      Object.entries(overview.collections).map(([resource, items]) => [
        resource,
        {
          items: items.map(({ id, mac, modelKey, name, state, type }) => ({ id, mac, modelKey, name, state, type })),
          notOnline: items.filter((item) => item.state && item.state !== "CONNECTED" && item.state !== "ONLINE").length,
          total: items.length,
        },
      ]),
    ),
    nvr: overview.nvr,
    unavailable: overview.unavailable,
  };
}
