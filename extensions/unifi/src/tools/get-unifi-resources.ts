import { UniFiClient } from "../api/client";
import { getResourceDefinition } from "../api/resources";
import { resolveNetworkSite } from "../api/sites";

type Resource =
  | "network-sites"
  | "network-pending-devices"
  | "network-devices"
  | "network-clients"
  | "network-networks"
  | "network-wifi"
  | "network-vouchers"
  | "network-firewall-policies"
  | "network-firewall-zones"
  | "network-acl-rules"
  | "network-lags"
  | "network-mc-lag-domains"
  | "network-switch-stacks"
  | "network-dns-policies"
  | "network-traffic-matching-lists"
  | "network-device-tags"
  | "network-radius-profiles"
  | "network-vpn-servers"
  | "network-vpn-tunnels"
  | "network-wans"
  | "network-countries"
  | "network-dpi-applications"
  | "network-dpi-categories"
  | "protect-viewers"
  | "protect-liveviews"
  | "protect-arm-profiles"
  | "protect-lights"
  | "protect-cameras"
  | "protect-sensors"
  | "protect-sirens"
  | "protect-fobs"
  | "protect-relays"
  | "protect-speakers"
  | "protect-bridges"
  | "protect-link-stations"
  | "protect-alarm-hubs"
  | "protect-nvr"
  | "protect-chimes"
  | "protect-users"
  | "protect-identity-users"
  | "site-manager-hosts"
  | "site-manager-sites"
  | "site-manager-devices"
  | "site-manager-sd-wan"
  | "site-manager-isp-metrics"
  | "mobility-workspaces"
  | "mobility-admins"
  | "mobility-devices"
  | "mobility-device-clients"
  | "innerspace-project"
  | "innerspace-floor-plans"
  | "innerspace-access-points"
  | "innerspace-switches"
  | "innerspace-inventory"
  | "carrier-subscribers"
  | "carrier-service-plans";

type Input = {
  /** Mobility device ID. Required only for mobility-device-clients. */
  deviceId?: string;
  /** Maximum number of results to return, from 1 to 100. Defaults to 25. */
  limit?: number;
  /** Resource key. Examples: network-networks, network-firewall-policies, protect-cameras, site-manager-hosts, mobility-workspaces, innerspace-floor-plans, carrier-service-plans. */
  resource: Resource;
  /** Network site ID, name, or internal reference. Omit to use the selected site. */
  site?: string;
  /** Mobility workspace ID. Required for mobility-admins, mobility-devices, and mobility-device-clients. */
  workspaceId?: string;
};

/** Read one documented UniFi resource collection without making changes. */
export default async function getUniFiResources(input: Input) {
  const client = UniFiClient.fromPreferences();
  const definition = getResourceDefinition(input.resource);
  const site = definition.requiresSite ? await resolveNetworkSite(client, input.site) : undefined;
  const items = await client.listResource(input.resource, {
    deviceId: input.deviceId,
    siteId: site?.id,
    workspaceId: input.workspaceId,
  });
  const requestedLimit = Number.isFinite(input.limit) ? Math.trunc(input.limit as number) : 25;
  const limit = Math.max(1, Math.min(100, requestedLimit));

  return {
    count: items.length,
    items: items.slice(0, limit),
    label: definition.label,
    resource: definition.key,
    truncated: items.length > limit,
  };
}
