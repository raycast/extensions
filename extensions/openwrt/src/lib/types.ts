export type ExtensionPreferences = Preferences;

export interface UbusSessionLogin {
  ubus_rpc_session: string;
  timeout: number;
  expires?: number;
  acls?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

export interface SystemBoardRelease {
  distribution?: string;
  version?: string;
  revision?: string;
  target?: string;
  description?: string;
  builddate?: string;
}

export interface SystemBoard {
  kernel: string;
  hostname: string;
  system: string;
  model: string;
  board_name?: string;
  rootfs_type?: string;
  release?: SystemBoardRelease;
}

export interface SystemMemory {
  total: number;
  free: number;
  shared?: number;
  buffered?: number;
  available?: number;
  cached?: number;
}

export interface SystemSwap {
  total: number;
  free: number;
}

export interface SystemMountStats {
  total: number;
  free: number;
  used: number;
  avail: number;
}

export interface SystemInfo {
  localtime: number;
  uptime: number;
  load: [number, number, number];
  memory: SystemMemory;
  swap?: SystemSwap;
  root?: SystemMountStats;
  tmp?: SystemMountStats;
}

export interface DhcpLeaseRaw {
  expires?: number | false;
  hostname?: string;
  macaddr?: string;
  duid?: string;
  ipaddr?: string;
  ip6addr?: string;
  ip6addrs?: string[];
}

export interface HostHintRaw {
  ipaddrs?: string[];
  ip6addrs?: string[];
  name?: string;
}

export interface IwinfoInfo {
  phy?: string;
  ssid?: string;
  bssid?: string;
  mode?: string;
  channel?: number;
  frequency?: number;
  txpower?: number;
  quality?: number;
  quality_max?: number;
  signal?: number;
  noise?: number;
  bitrate?: number;
  hwmode?: string;
  htmode?: string;
  hwmodes_text?: string;
  encryption?: {
    enabled?: boolean;
    wpa?: number[];
    authentication?: string[];
  };
  hardware?: {
    name?: string;
  };
}

export interface IwinfoRateStats {
  rate?: number;
  bytes?: number;
  packets?: number;
  ht?: boolean;
  vht?: boolean;
  he?: boolean;
  eht?: boolean;
  mhz?: number;
}

export interface IwinfoAssocEntry {
  mac: string;
  signal?: number;
  signal_avg?: number;
  noise?: number;
  inactive?: number;
  connected_time?: number;
  thr?: number;
  authorized?: boolean;
  rx?: IwinfoRateStats;
  tx?: IwinfoRateStats;
}

export interface NetworkInterfaceDumpItem {
  interface: string;
  up: boolean;
  pending?: boolean;
  available?: boolean;
  autostart?: boolean;
  uptime?: number;
  l3_device?: string;
  device?: string;
  proto?: string;
  "ipv4-address"?: Array<{ address: string; mask: number }>;
  "ipv6-address"?: Array<{ address: string; mask: number }>;
  "ipv6-prefix"?: Array<{ address: string; mask: number }>;
  route?: Array<{ target: string; mask: number; nexthop: string; source?: string }>;
  "dns-server"?: string[];
  inactive?: {
    "dns-server"?: string[];
  };
  data?: Record<string, unknown>;
}

export interface NetworkDeviceEntry {
  up?: boolean;
  type?: string | number;
  mac?: string;
  link?: {
    speed?: number;
    duplex?: string;
    carrier?: boolean;
  };
  stats?: {
    rx_bytes?: number;
    tx_bytes?: number;
    rx_packets?: number;
    tx_packets?: number;
    rx_errors?: number;
    tx_errors?: number;
  };
}

export interface RcServiceEntry {
  start?: number;
  stop?: number;
  enabled?: boolean;
  running?: boolean;
}

export interface LuciInitEntry {
  index?: number;
  stop?: number | null;
  enabled?: boolean;
}

export interface ProcdServiceInstance {
  running?: boolean;
  pid?: number;
  command?: string[];
  term_timeout?: number;
  respawn?: {
    threshold?: number;
    timeout?: number;
    retry?: number;
  };
  env?: Record<string, string>;
  limits?: Record<string, string>;
}

export interface ProcdServiceEntry {
  instances?: Record<string, ProcdServiceInstance>;
}

export interface FileExecResult {
  code: number;
  stdout?: string;
  stderr?: string;
}

export type WifiBand = "2.4 GHz" | "5 GHz" | "6 GHz" | "Unknown";

export interface WifiRadioSummary {
  device: string;
  phy: string;
  ssid: string;
  band: WifiBand;
  channel: number | null;
  frequency: number | null;
  mode: string;
  htmode: string;
  bitrateKbps: number | null;
  stationCount: number;
  hardware: string;
}

export interface RouterInterfaceSummary {
  name: string;
  proto: string;
  device: string;
  up: boolean;
  pending: boolean;
  uptime: number | null;
  ipv4: string[];
  ipv6: string[];
  gateway: string | null;
  dns: string[];
  linkSpeedMbps: number | null;
  rxBytes: number | null;
  txBytes: number | null;
  isVpn: boolean;
}

export interface RouterStatusSnapshot {
  routerUrl: string;
  board: SystemBoard;
  info: SystemInfo;
  luciVersion: string | null;
  tempInfo: string | null;
  cpuUsage: string | null;
  conntrack: { count: number; max: number } | null;
  interfaces: RouterInterfaceSummary[];
  radios: WifiRadioSummary[];
  dhcpLeaseCount: number;
  wifiClientCount: number;
  fetchedAt: number;
}

export interface ClientWifiDetails {
  device: string;
  ssid: string;
  band: WifiBand;
  channel: number | null;
  signal: number | null;
  signalAvg: number | null;
  noise: number | null;
  connectedTimeSec: number | null;
  inactiveMs: number | null;
  rxRateKbps: number | null;
  txRateKbps: number | null;
  rxBytes: number | null;
  txBytes: number | null;
  standard: string | null;
}

export interface ClientRecord {
  id: string;
  mac: string;
  hostname: string;
  ip: string | null;
  allIps: string[];
  ipv6: string[];
  connectionType: "wifi" | "dhcp" | "static";
  hasDhcpLease: boolean;
  leaseExpiresSec: number | null;
  wifi: ClientWifiDetails | null;
}

export interface WireGuardPeer {
  publicKey: string;
  endpoint: string | null;
  allowedIps: string;
  latestHandshakeSec: number | null;
  rxBytes: number;
  txBytes: number;
  keepalive: string | null;
}

export interface ServiceInstanceSummary {
  name: string;
  running: boolean;
  pid: number | null;
  command: string[];
  respawn?: {
    threshold?: number;
    timeout?: number;
    retry?: number;
  };
}

export interface ManagedInitService {
  id: string;
  kind: "service";
  name: string;
  running: boolean;
  enabled: boolean;
  startPriority: number | null;
  stopPriority: number | null;
  pinned: boolean;
  critical: boolean;
  instances: ServiceInstanceSummary[];
}

export interface ManagedNetworkInterface {
  id: string;
  kind: "interface";
  name: string;
  proto: string;
  device: string;
  up: boolean;
  pending: boolean;
  uptime: number | null;
  ipv4: string[];
  ipv6: string[];
  gateway: string | null;
  dns: string[];
  rxBytes: number | null;
  txBytes: number | null;
  isVpn: boolean;
  pinned: boolean;
  critical: boolean;
}

export type ManagedServiceItem = ManagedInitService | ManagedNetworkInterface;

export interface StatusCheckItem {
  id: string;
  title: string;
  category: "router" | "network" | "services" | "wifi" | "dns" | "ping";
  status: "pass" | "warn" | "fail";
  summary: string;
  latencyMs: number | null;
  detailMarkdown: string;
  target?: string;
}

export interface PingResult {
  target: string;
  reachable: boolean;
  transmitted: number;
  received: number;
  lossPercent: number;
  minMs: number | null;
  avgMs: number | null;
  maxMs: number | null;
  rawOutput: string;
}

export interface DnsLookupResult {
  domain: string;
  resolved: boolean;
  addresses: string[];
  latencyMs: number;
  rawOutput: string;
}

export interface StaticDhcpLease {
  section: string;
  name: string;
  macs: string[];
  ip: string;
  leasetime: string | null;
  hostid: string | null;
}

export interface LocalDnsRecord {
  section: string;
  name: string;
  ip: string;
}

export interface DhcpDnsSnapshot {
  staticLeases: StaticDhcpLease[];
  dnsRecords: LocalDnsRecord[];
}

export interface WifiInterfaceConfig {
  section: string;
  device: string;
  ssid: string;
  encryption: string;
  mode: string;
  network: string;
  disabled: boolean;
  hidden: boolean;
  hasKey: boolean;
  band: WifiBand;
  channel: number | null;
  htmode: string;
  radioDisabled: boolean;
  liveDevice: string | null;
  stationCount: number;
  bitrateKbps: number | null;
}

export interface LiveWifiQrSection {
  section: string;
  ssid: string;
  encryption: string;
  hidden: boolean;
  disabled: boolean;
  password: string;
}

export interface WifiScanResult {
  bssid: string;
  ssid: string;
  band: WifiBand;
  channel: number | null;
  mhz: number | null;
  signal: number | null;
  quality: number | null;
  qualityMax: number | null;
  widthMhz: number | null;
  encryption: string;
}

export type SyslogSeverity = "emerg" | "alert" | "crit" | "err" | "warn" | "notice" | "info" | "debug" | "unknown";

export interface SyslogEntry {
  id: string;
  timestamp: string;
  facility: string;
  severity: SyslogSeverity;
  daemon: string;
  pid: string | null;
  message: string;
  raw: string;
}

export interface ConntrackEntry {
  id: string;
  layer3: string;
  layer4: string;
  src: string;
  dst: string;
  sport: number | null;
  dport: number | null;
  bytes: number;
  packets: number;
  timeout: number;
  srcHost: string | null;
  dstHost: string | null;
}

export interface RouterProcessEntry {
  pid: number;
  ppid: number;
  user: string;
  stat: string;
  vsz: string;
  vszBytes: number;
  memPercent: number;
  cpuPercent: number;
  command: string;
  startTime?: string | null;
}

export interface FirewallRedirect {
  section: string;
  name: string;
  enabled: boolean;
  src: string;
  dest: string;
  proto: string;
  srcDport: string;
  destIp: string;
  destPort: string;
  target: string;
}

export interface UpnpRule {
  num: string;
  proto: string;
  extport: number;
  intaddr: string;
  intport: number;
  descr: string;
  expires: number;
  hostHint: string | null;
}

export interface FirewallUpnpSnapshot {
  redirects: FirewallRedirect[];
  upnpRules: UpnpRule[];
  upnpAvailable: boolean;
  upnpError?: string | null;
}
