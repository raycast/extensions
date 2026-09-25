export type UniFiService = "network" | "protect" | "site-manager" | "mobility" | "innerspace" | "carrier-fabric";
export type PaginationStrategy = "site-manager-token" | "mobility-offset" | "carrier-cursor";

export interface ResourceContext {
  deviceId?: string;
  siteId?: string;
  workspaceId?: string;
}

export interface ResourceDefinition {
  key: string;
  label: string;
  pagination?: PaginationStrategy;
  requiresSite?: boolean;
  service: UniFiService;
  path: (context: ResourceContext) => string;
}

function required(context: ResourceContext, key: keyof ResourceContext, label: string): string {
  const value = context[key]?.trim();
  if (!value) throw new Error(`${label} is required for this resource.`);
  return encodeURIComponent(value);
}

const sitePath = (suffix: string) => (context: ResourceContext) =>
  `/v1/sites/${required(context, "siteId", "A Network site ID")}${suffix}`;

const workspacePath = (suffix: string) => (context: ResourceContext) =>
  `/v1/mobility/workspaces/${required(context, "workspaceId", "A Mobility workspace ID")}${suffix}`;

export const RESOURCE_DEFINITIONS = [
  { key: "network-sites", label: "Network Sites", service: "network", path: () => "/v1/sites" },
  {
    key: "network-pending-devices",
    label: "Devices Pending Adoption",
    service: "network",
    path: () => "/v1/pending-devices",
  },
  {
    key: "network-devices",
    label: "Network Devices",
    requiresSite: true,
    service: "network",
    path: sitePath("/devices"),
  },
  {
    key: "network-clients",
    label: "Connected Clients",
    requiresSite: true,
    service: "network",
    path: sitePath("/clients"),
  },
  { key: "network-networks", label: "Networks", requiresSite: true, service: "network", path: sitePath("/networks") },
  {
    key: "network-wifi",
    label: "Wi-Fi Broadcasts",
    requiresSite: true,
    service: "network",
    path: sitePath("/wifi/broadcasts"),
  },
  {
    key: "network-vouchers",
    label: "Hotspot Vouchers",
    requiresSite: true,
    service: "network",
    path: sitePath("/hotspot/vouchers"),
  },
  {
    key: "network-firewall-policies",
    label: "Firewall Policies",
    requiresSite: true,
    service: "network",
    path: sitePath("/firewall/policies"),
  },
  {
    key: "network-firewall-zones",
    label: "Firewall Zones",
    requiresSite: true,
    service: "network",
    path: sitePath("/firewall/zones"),
  },
  {
    key: "network-acl-rules",
    label: "ACL Rules",
    requiresSite: true,
    service: "network",
    path: sitePath("/acl-rules"),
  },
  {
    key: "network-lags",
    label: "Link Aggregation Groups",
    requiresSite: true,
    service: "network",
    path: sitePath("/switching/lags"),
  },
  {
    key: "network-mc-lag-domains",
    label: "MC-LAG Domains",
    requiresSite: true,
    service: "network",
    path: sitePath("/switching/mc-lag-domains"),
  },
  {
    key: "network-switch-stacks",
    label: "Switch Stacks",
    requiresSite: true,
    service: "network",
    path: sitePath("/switching/switch-stacks"),
  },
  {
    key: "network-dns-policies",
    label: "DNS Policies",
    requiresSite: true,
    service: "network",
    path: sitePath("/dns/policies"),
  },
  {
    key: "network-traffic-matching-lists",
    label: "Traffic Matching Lists",
    requiresSite: true,
    service: "network",
    path: sitePath("/traffic-matching-lists"),
  },
  {
    key: "network-device-tags",
    label: "Device Tags",
    requiresSite: true,
    service: "network",
    path: sitePath("/device-tags"),
  },
  {
    key: "network-radius-profiles",
    label: "RADIUS Profiles",
    requiresSite: true,
    service: "network",
    path: sitePath("/radius/profiles"),
  },
  {
    key: "network-vpn-servers",
    label: "VPN Servers",
    requiresSite: true,
    service: "network",
    path: sitePath("/vpn/servers"),
  },
  {
    key: "network-vpn-tunnels",
    label: "Site-to-Site VPN Tunnels",
    requiresSite: true,
    service: "network",
    path: sitePath("/vpn/site-to-site-tunnels"),
  },
  { key: "network-wans", label: "WAN Interfaces", requiresSite: true, service: "network", path: sitePath("/wans") },
  { key: "network-countries", label: "Countries", service: "network", path: () => "/v1/countries" },
  {
    key: "network-dpi-applications",
    label: "DPI Applications",
    service: "network",
    path: () => "/v1/dpi/applications",
  },
  { key: "network-dpi-categories", label: "DPI Categories", service: "network", path: () => "/v1/dpi/categories" },

  { key: "protect-viewers", label: "Protect Viewers", service: "protect", path: () => "/v1/viewers" },
  { key: "protect-liveviews", label: "Protect Live Views", service: "protect", path: () => "/v1/liveviews" },
  { key: "protect-arm-profiles", label: "Protect Arm Profiles", service: "protect", path: () => "/v1/arm-profiles" },
  { key: "protect-lights", label: "Protect Lights", service: "protect", path: () => "/v1/lights" },
  { key: "protect-cameras", label: "Protect Cameras", service: "protect", path: () => "/v1/cameras" },
  { key: "protect-sensors", label: "Protect Sensors", service: "protect", path: () => "/v1/sensors" },
  { key: "protect-sirens", label: "Protect Sirens", service: "protect", path: () => "/v1/sirens" },
  { key: "protect-fobs", label: "Protect Fobs", service: "protect", path: () => "/v1/fobs" },
  { key: "protect-relays", label: "Protect Relays", service: "protect", path: () => "/v1/relays" },
  { key: "protect-speakers", label: "Protect Speakers", service: "protect", path: () => "/v1/speakers" },
  { key: "protect-bridges", label: "Protect Bridges", service: "protect", path: () => "/v1/bridges" },
  { key: "protect-link-stations", label: "Protect Link Stations", service: "protect", path: () => "/v1/link-stations" },
  { key: "protect-alarm-hubs", label: "Protect Alarm Hubs", service: "protect", path: () => "/v1/alarm-hubs" },
  { key: "protect-nvr", label: "Protect NVR", service: "protect", path: () => "/v1/nvrs" },
  { key: "protect-chimes", label: "Protect Chimes", service: "protect", path: () => "/v1/chimes" },
  { key: "protect-users", label: "Protect Users", service: "protect", path: () => "/v1/users" },
  { key: "protect-identity-users", label: "UniFi Identity Users", service: "protect", path: () => "/v1/ulp-users" },

  {
    key: "site-manager-hosts",
    label: "Site Manager Hosts",
    pagination: "site-manager-token",
    service: "site-manager",
    path: () => "/v1/hosts",
  },
  {
    key: "site-manager-sites",
    label: "Site Manager Sites",
    pagination: "site-manager-token",
    service: "site-manager",
    path: () => "/v1/sites",
  },
  {
    key: "site-manager-devices",
    label: "Site Manager Devices",
    pagination: "site-manager-token",
    service: "site-manager",
    path: () => "/v1/devices",
  },
  {
    key: "site-manager-sd-wan",
    label: "SD-WAN Configurations",
    service: "site-manager",
    path: () => "/v1/sd-wan-configs",
  },
  {
    key: "site-manager-isp-metrics",
    label: "ISP Metrics, Last 24 Hours",
    service: "site-manager",
    path: () => "/v1/isp-metrics/5m?duration=24h",
  },

  {
    key: "mobility-workspaces",
    label: "Mobility Workspaces",
    service: "mobility",
    path: () => "/v1/mobility/workspaces",
  },
  {
    key: "mobility-admins",
    label: "Mobility Workspace Admins",
    service: "mobility",
    path: workspacePath("/admins"),
  },
  {
    key: "mobility-devices",
    label: "Mobility Devices",
    pagination: "mobility-offset",
    service: "mobility",
    path: workspacePath("/devices"),
  },
  {
    key: "mobility-device-clients",
    label: "Mobility Device Clients",
    pagination: "mobility-offset",
    service: "mobility",
    path: (context) =>
      `${workspacePath("/devices")(context)}/${required(context, "deviceId", "A Mobility device ID")}/clients`,
  },

  { key: "innerspace-project", label: "InnerSpace Project", service: "innerspace", path: () => "/v1/project" },
  {
    key: "innerspace-floor-plans",
    label: "InnerSpace Floor Plans",
    service: "innerspace",
    path: () => "/v1/floor_plans",
  },
  {
    key: "innerspace-access-points",
    label: "InnerSpace Access Points",
    service: "innerspace",
    path: () => "/v1/access_points",
  },
  { key: "innerspace-switches", label: "InnerSpace Switches", service: "innerspace", path: () => "/v1/switches" },
  {
    key: "innerspace-inventory",
    label: "InnerSpace Unplaced Inventory",
    service: "innerspace",
    path: () => "/v1/inventory",
  },

  {
    key: "carrier-subscribers",
    label: "Carrier Subscribers",
    pagination: "carrier-cursor",
    service: "carrier-fabric",
    path: () => "/v1/carrier/subscribers",
  },
  {
    key: "carrier-service-plans",
    label: "Carrier Service Plans",
    service: "carrier-fabric",
    path: () => "/v1/carrier/service-plans",
  },
] as const satisfies readonly ResourceDefinition[];

export type ResourceKey = (typeof RESOURCE_DEFINITIONS)[number]["key"];

export function getResourceDefinition(key: string): ResourceDefinition {
  const definition = RESOURCE_DEFINITIONS.find((candidate) => candidate.key === key);
  if (!definition) throw new Error(`Unsupported UniFi resource: ${key}`);
  return definition;
}
