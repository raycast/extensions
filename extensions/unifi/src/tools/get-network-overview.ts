import { UniFiClient } from "../api/client";
import { resolveNetworkSite } from "../api/sites";

type Input = {
  /** Optional exact site ID, site name, or internal reference. Omit to use the site selected in Raycast. */
  site?: string;
};

/** Get current status and configuration counts for one UniFi Network site. */
export default async function getNetworkOverview(input: Input) {
  const client = UniFiClient.fromPreferences();
  const site = await resolveNetworkSite(client, input.site);
  const overview = await client.getNetworkOverview(site);
  const offlineDevices = overview.devices.filter((device) => device.state !== "ONLINE");

  return {
    clients: {
      byType: Object.fromEntries(
        ["WIRED", "WIRELESS", "VPN", "TELEPORT"].map((type) => [
          type,
          overview.clients.filter((client) => client.type === type).length,
        ]),
      ),
      total: overview.clients.length,
    },
    devices: {
      firmwareUpdates: overview.devices
        .filter((device) => device.firmwareUpdatable)
        .map(({ firmwareVersion, id, model, name }) => ({ firmwareVersion, id, model, name })),
      notOnline: offlineDevices.map(({ id, ipAddress, model, name, state }) => ({ id, ipAddress, model, name, state })),
      online: overview.devices.length - offlineDevices.length,
      total: overview.devices.length,
    },
    firewallPolicies: overview.firewallPolicies.length,
    networks: overview.networks.map(({ enabled, id, management, name, vlanId }) => ({
      enabled,
      id,
      management,
      name,
      vlanId,
    })),
    site,
    unavailable: overview.unavailable,
    wans: overview.wans,
    wifiBroadcasts: overview.wifiBroadcasts.map(({ enabled, id, name, type }) => ({ enabled, id, name, type })),
  };
}
