import {
  buildKeyValueTable,
  buildMarkdownTable,
  buildSafeCodeBlock,
  escapeMarkdownText,
  formatBytes,
  formatDuration,
  formatFrequencyBand,
  formatLoadAverage,
  formatWifiStandard,
  inlineCode,
  parseCsvPreference,
} from "./format";
import type {
  ClientRecord,
  ClientWifiDetails,
  DhcpLeaseRaw,
  DnsLookupResult,
  ExtensionPreferences,
  FileExecResult,
  HostHintRaw,
  IwinfoAssocEntry,
  IwinfoInfo,
  LuciInitEntry,
  ManagedInitService,
  ManagedNetworkInterface,
  ManagedServiceItem,
  NetworkDeviceEntry,
  NetworkInterfaceDumpItem,
  PingResult,
  ProcdServiceEntry,
  RcServiceEntry,
  RouterInterfaceSummary,
  RouterStatusSnapshot,
  ServiceInstanceSummary,
  StatusCheckItem,
  SystemBoard,
  SystemInfo,
  WifiRadioSummary,
  WireGuardPeer,
} from "./types";
import {
  type UbusBatchItemResult,
  type UbusCallSpec,
  OpenWrtError,
  createAbortError,
  normalizeRouterUrl,
  ubusBatch,
  ubusCall,
  ubusCallOptional,
} from "./ubus";

export const DEFAULT_PING_TARGETS = ["1.1.1.1", "8.8.8.8"];
export const DEFAULT_DNS_TEST_DOMAIN = "cloudflare.com";
export const DEFAULT_PINNED_SERVICES = ["dnsmasq", "firewall", "uhttpd", "dropbear", "wireguard"];

const BACKUP_INIT_PATTERN = /\.(?:bak|backup)(?:\.|$)/i;

const VPN_PROTOS = new Set([
  "wireguard",
  "tailscale",
  "openvpn",
  "zerotier",
  "pptp",
  "l2tp",
  "gre",
  "vxlan",
  "xfrm",
  "ipsec",
]);

const VPN_NAME_PATTERN = /^(wg|wireguard|tailscale|ts|vpn|tun|sing|zt)/i;
const CRITICAL_SERVICES = new Set(["network", "firewall", "uhttpd", "dropbear", "wpad", "rpcd", "dnsmasq"]);
const CRITICAL_INTERFACES = new Set(["lan", "wan"]);
const TARGET_HOST_PATTERN = /^[a-zA-Z0-9.:_-]+$/;
const IDENTIFIER_PATTERN = /^[a-zA-Z0-9._-]+$/;
const MAC_ADDRESS_PATTERN = /^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/;
const FATAL_STATUS_ERROR_CODES = new Set<OpenWrtError["code"]>([
  "INVALID_URL",
  "AUTH_FAILED",
  "TLS_ERROR",
  "CONNECTION_FAILED",
  "TIMEOUT",
  "NOT_FOUND",
]);

/** Validates an IPv4, IPv6, or hostname target before passing it to router tools. */
export function validateTargetHost(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 253 || trimmed.startsWith("-") || !TARGET_HOST_PATTERN.test(trimmed)) {
    throw new OpenWrtError(
      "RPC_ERROR",
      `Invalid host or IP address "${raw}". Only letters, digits, dots, colons, hyphens, and underscores are allowed.`,
    );
  }
  return trimmed;
}

/** Validates an OpenWrt service, interface, or wireless device identifier. */
export function validateIdentifier(raw: string, label = "identifier"): string {
  const trimmed = raw.trim();
  if (
    !trimmed ||
    trimmed.length > 128 ||
    trimmed.startsWith("-") ||
    trimmed === "." ||
    trimmed === ".." ||
    !IDENTIFIER_PATTERN.test(trimmed)
  ) {
    throw new OpenWrtError("RPC_ERROR", `Invalid ${label} "${raw}".`);
  }
  return trimmed;
}

function getBatchValue<T>(item: UbusBatchItemResult | undefined): T | null {
  if (!item || !item.ok) {
    return null;
  }
  return item.data as T;
}

function isPermissionDeniedCode(statusCode: number): boolean {
  return statusCode === 6 || statusCode === -32002;
}

function throwBatchFailure(results: UbusBatchItemResult[], contextMessage: string): never {
  const failed = results.filter((item): item is Extract<UbusBatchItemResult, { ok: false }> => !item.ok);
  const denied = failed.find((item) => isPermissionDeniedCode(item.statusCode));
  if (denied) {
    throw new OpenWrtError("PERMISSION_DENIED", `${contextMessage}: ${denied.message}.`);
  }
  const first = failed[0];
  throw new OpenWrtError("RPC_ERROR", `${contextMessage}: ${first?.message ?? "ubus call failed"}.`);
}

function normalizeMac(mac: string): string {
  return mac.trim().toUpperCase();
}

function isVpnInterface(name: string, proto: string): boolean {
  return VPN_PROTOS.has(proto.toLowerCase()) || VPN_NAME_PATTERN.test(name);
}

function isApiPaAddress(ip: string): boolean {
  return ip.startsWith("169.254.");
}

function pickBestIpv4(candidates: string[]): string | null {
  const valid = candidates.filter((ip) => ip && ip.includes("."));
  if (valid.length === 0) {
    return null;
  }
  return valid.find((ip) => !isApiPaAddress(ip)) ?? valid[0];
}

function sortAndDedupeIpv6(candidates: string[]): string[] {
  const unique = Array.from(new Set(candidates.map((ip) => ip.trim()).filter((ip) => ip.includes(":"))));
  return unique.sort((a, b) => {
    const aLink = a.toLowerCase().startsWith("fe80:") ? 1 : 0;
    const bLink = b.toLowerCase().startsWith("fe80:") ? 1 : 0;
    return aLink - bLink || a.localeCompare(b);
  });
}

function stripIpv6HostMask(ip: string): string {
  return ip.trim().replace(/\/128$/, "");
}

function normalizeDhcpLease(lease: DhcpLeaseRaw): DhcpLeaseRaw {
  return {
    ...lease,
    ip6addr: typeof lease.ip6addr === "string" ? stripIpv6HostMask(lease.ip6addr) : lease.ip6addr,
    ip6addrs: Array.isArray(lease.ip6addrs)
      ? lease.ip6addrs.filter((ip): ip is string => typeof ip === "string").map(stripIpv6HostMask)
      : lease.ip6addrs,
  };
}

function parseDhcpLeasesText(content: string): { ipv4Leases: DhcpLeaseRaw[]; allLeases: DhcpLeaseRaw[] } {
  const nowSec = Math.floor(Date.now() / 1000);
  const leases: DhcpLeaseRaw[] = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    const parts = line.split(/\s+/);
    if (parts.length < 4) {
      continue;
    }
    const expiresEpoch = Number(parts[0]);
    const macaddr = parts[1];
    if (!MAC_ADDRESS_PATTERN.test(macaddr)) {
      continue;
    }
    const ipaddr = parts[2];
    const hostname = parts[3] === "*" ? "" : parts[3];
    const duid = parts[4];

    leases.push({
      expires: Number.isFinite(expiresEpoch) && expiresEpoch > 0 ? Math.max(0, expiresEpoch - nowSec) : false,
      macaddr,
      ipaddr,
      hostname,
      duid,
    });
  }

  return { ipv4Leases: leases, allLeases: leases };
}

async function resolveDhcpLeases(
  batchItem: UbusBatchItemResult | undefined,
  prefs: Partial<ExtensionPreferences>,
  signal?: AbortSignal,
): Promise<{ ipv4Leases: DhcpLeaseRaw[]; allLeases: DhcpLeaseRaw[]; sourceOk: boolean }> {
  const rpcLeases = getBatchValue<{ dhcp_leases?: DhcpLeaseRaw[]; dhcp6_leases?: DhcpLeaseRaw[] }>(batchItem);
  if (rpcLeases && (Array.isArray(rpcLeases.dhcp_leases) || Array.isArray(rpcLeases.dhcp6_leases))) {
    const ipv4Leases = Array.isArray(rpcLeases.dhcp_leases) ? rpcLeases.dhcp_leases.map(normalizeDhcpLease) : [];
    const dhcp6Leases = Array.isArray(rpcLeases.dhcp6_leases) ? rpcLeases.dhcp6_leases.map(normalizeDhcpLease) : [];
    return {
      ipv4Leases,
      allLeases: [...ipv4Leases, ...dhcp6Leases],
      sourceOk: true,
    };
  }

  const filePayload = await ubusCallOptional<{ data?: string }>(
    "file",
    "read",
    { path: "/tmp/dhcp.leases" },
    prefs,
    signal,
  );
  if (filePayload === null) {
    return { ipv4Leases: [], allLeases: [], sourceOk: false };
  }
  const parsed = filePayload.data ? parseDhcpLeasesText(filePayload.data) : { ipv4Leases: [], allLeases: [] };
  return {
    ...parsed,
    sourceOk: true,
  };
}

function buildInterfaceSummaries(
  dumpItems: NetworkInterfaceDumpItem[],
  devices: Record<string, NetworkDeviceEntry>,
): RouterInterfaceSummary[] {
  return dumpItems
    .filter((item) => item.interface && item.interface !== "loopback")
    .map((item) => {
      const deviceName = item.l3_device || item.device || "";
      const dev = deviceName ? devices[deviceName] : undefined;
      const proto = item.proto || "unknown";
      const ipv4 = (item["ipv4-address"] ?? []).map((addr) => `${addr.address}/${addr.mask}`);
      const ipv6 = (item["ipv6-address"] ?? []).map((addr) => `${addr.address}/${addr.mask}`);
      const validDefaultRoutes = (item.route ?? []).filter(
        (r) =>
          (r.target === "0.0.0.0" || r.target === "::") &&
          r.mask === 0 &&
          Boolean(r.nexthop) &&
          r.nexthop !== "0.0.0.0" &&
          r.nexthop !== "::",
      );
      const defaultRoute = validDefaultRoutes.find((r) => r.target === "0.0.0.0") ?? validDefaultRoutes[0];
      const dns =
        item["dns-server"] && item["dns-server"].length > 0
          ? item["dns-server"]
          : (item.inactive?.["dns-server"] ?? []);
      const rawSpeed = dev?.link?.speed;
      const linkSpeedMbps =
        typeof rawSpeed === "number" &&
        Number.isFinite(rawSpeed) &&
        rawSpeed > 0 &&
        rawSpeed !== 65535 &&
        rawSpeed !== 4294967295
          ? rawSpeed
          : null;

      return {
        name: item.interface,
        proto,
        device: deviceName,
        up: Boolean(item.up),
        pending: Boolean(item.pending),
        uptime: typeof item.uptime === "number" ? item.uptime : null,
        ipv4,
        ipv6,
        gateway: defaultRoute?.nexthop ?? null,
        dns,
        linkSpeedMbps,
        rxBytes: typeof dev?.stats?.rx_bytes === "number" ? dev.stats.rx_bytes : null,
        txBytes: typeof dev?.stats?.tx_bytes === "number" ? dev.stats.tx_bytes : null,
        isVpn: isVpnInterface(item.interface, proto),
      };
    });
}

async function fetchWifiDevicesData(
  deviceNames: string[],
  prefs: Partial<ExtensionPreferences>,
  signal?: AbortSignal,
): Promise<{
  radios: WifiRadioSummary[];
  assocByDevice: Array<{ device: string; info: IwinfoInfo; entries: IwinfoAssocEntry[] }>;
}> {
  if (deviceNames.length === 0) {
    return { radios: [], assocByDevice: [] };
  }

  const calls: UbusCallSpec[] = [];
  for (const device of deviceNames) {
    calls.push({ object: "iwinfo", method: "info", args: { device } });
    calls.push({ object: "iwinfo", method: "assoclist", args: { device } });
  }

  const results = await ubusBatch(calls, prefs, signal);
  const radios: WifiRadioSummary[] = [];
  const assocByDevice: Array<{ device: string; info: IwinfoInfo; entries: IwinfoAssocEntry[] }> = [];

  for (let i = 0; i < deviceNames.length; i += 1) {
    const device = deviceNames[i];
    const info = getBatchValue<IwinfoInfo>(results[i * 2]) ?? {};
    const assoc = getBatchValue<{ results?: IwinfoAssocEntry[] }>(results[i * 2 + 1]);
    const entries = Array.isArray(assoc?.results) ? assoc.results : [];

    radios.push({
      device,
      phy: info.phy || device,
      ssid: info.ssid || "(hidden)",
      band: formatFrequencyBand(info.frequency),
      channel: typeof info.channel === "number" ? info.channel : null,
      frequency: typeof info.frequency === "number" ? info.frequency : null,
      mode: info.hwmodes_text || info.hwmode || info.mode || "Unknown",
      htmode: info.htmode || "",
      bitrateKbps: typeof info.bitrate === "number" ? info.bitrate : null,
      stationCount: entries.length,
      hardware: info.hardware?.name || "",
    });

    assocByDevice.push({ device, info, entries });
  }

  return { radios, assocByDevice };
}

/** Fetches overall OpenWrt system, interface, and wireless radio status. */
export async function fetchRouterStatus(
  prefs: Partial<ExtensionPreferences> = {},
  signal?: AbortSignal,
): Promise<RouterStatusSnapshot> {
  const { baseUrl } = normalizeRouterUrl(prefs.routerUrl);
  const batchResults = await ubusBatch(
    [
      { object: "system", method: "board" },
      { object: "system", method: "info" },
      { object: "network.interface", method: "dump" },
      { object: "luci-rpc", method: "getNetworkDevices" },
      { object: "iwinfo", method: "devices" },
      { object: "luci-rpc", method: "getDHCPLeases" },
      { object: "luci", method: "getVersion" },
      { object: "luci", method: "getTempInfo" },
      { object: "luci", method: "getCPUUsage" },
      { object: "file", method: "read", args: { path: "/proc/sys/net/netfilter/nf_conntrack_count" } },
      { object: "file", method: "read", args: { path: "/proc/sys/net/netfilter/nf_conntrack_max" } },
    ],
    prefs,
    signal,
  );

  const [boardRes, infoRes, ifaceRes, devRes, iwDevsRes, dhcpRes, luciVerRes, tempRes, cpuRes, ctCountRes, ctMaxRes] =
    batchResults;

  if (!boardRes.ok) {
    throw new OpenWrtError(
      isPermissionDeniedCode(boardRes.statusCode) ? "PERMISSION_DENIED" : "RPC_ERROR",
      `Failed to read system.board: ${boardRes.message}.`,
    );
  }
  if (!infoRes.ok) {
    throw new OpenWrtError(
      isPermissionDeniedCode(infoRes.statusCode) ? "PERMISSION_DENIED" : "RPC_ERROR",
      `Failed to read system.info: ${infoRes.message}.`,
    );
  }

  const board = boardRes.data as SystemBoard;
  const info = infoRes.data as SystemInfo;
  const rawIfaces = getBatchValue<{ interface?: NetworkInterfaceDumpItem[] }>(ifaceRes)?.interface ?? [];
  const wifiDeviceNames = getBatchValue<{ devices?: string[] }>(iwDevsRes)?.devices ?? [];

  const [leaseData, wifiData, fallbackDevices] = await Promise.all([
    resolveDhcpLeases(dhcpRes, prefs, signal),
    fetchWifiDevicesData(wifiDeviceNames, prefs, signal),
    devRes.ok
      ? Promise.resolve(null)
      : ubusCallOptional<Record<string, NetworkDeviceEntry>>("network.device", "status", {}, prefs, signal),
  ]);
  const networkDevices = getBatchValue<Record<string, NetworkDeviceEntry>>(devRes) ?? fallbackDevices ?? {};

  const luciVer = getBatchValue<{ revision?: string; branch?: string }>(luciVerRes);
  const luciVersion = luciVer?.revision
    ? luciVer.branch
      ? `${luciVer.branch} (${luciVer.revision})`
      : luciVer.revision
    : null;
  const tempInfo = getBatchValue<{ tempinfo?: string }>(tempRes)?.tempinfo?.trim() || null;
  const cpuUsage = getBatchValue<{ cpuusage?: string }>(cpuRes)?.cpuusage?.trim() || null;

  const ctCountRaw = getBatchValue<{ data?: string }>(ctCountRes)?.data?.trim();
  const ctMaxRaw = getBatchValue<{ data?: string }>(ctMaxRes)?.data?.trim();
  const ctCount = ctCountRaw ? Number.parseInt(ctCountRaw, 10) : Number.NaN;
  const ctMax = ctMaxRaw ? Number.parseInt(ctMaxRaw, 10) : Number.NaN;
  const conntrack =
    Number.isFinite(ctCount) && Number.isFinite(ctMax) && ctMax > 0 ? { count: ctCount, max: ctMax } : null;

  const interfaces = buildInterfaceSummaries(rawIfaces, networkDevices);
  const wifiClientCount = wifiData.radios.reduce((sum, r) => sum + r.stationCount, 0);

  return {
    routerUrl: baseUrl,
    board,
    info,
    luciVersion,
    tempInfo,
    cpuUsage,
    conntrack,
    interfaces,
    radios: wifiData.radios,
    dhcpLeaseCount: leaseData.ipv4Leases.length,
    wifiClientCount,
    fetchedAt: Date.now(),
  };
}

function shouldReplaceWifiEntry(current: ClientWifiDetails | null, nextInactiveMs: number | null): boolean {
  if (!current) {
    return true;
  }
  if (current.inactiveMs === null) {
    return nextInactiveMs !== null;
  }
  return nextInactiveMs !== null && nextInactiveMs < current.inactiveMs;
}

/** Fetches and merges connected Wi-Fi stations, DHCP leases, and host hints by MAC address. */
export async function fetchClients(
  prefs: Partial<ExtensionPreferences> = {},
  signal?: AbortSignal,
): Promise<ClientRecord[]> {
  const [dhcpRes, hintsRes, iwDevsRes] = await ubusBatch(
    [
      { object: "luci-rpc", method: "getDHCPLeases" },
      { object: "luci-rpc", method: "getHostHints" },
      { object: "iwinfo", method: "devices" },
    ],
    prefs,
    signal,
  );

  const hints = getBatchValue<Record<string, HostHintRaw>>(hintsRes) ?? {};
  const wifiDeviceNames = getBatchValue<{ devices?: string[] }>(iwDevsRes)?.devices ?? [];

  const [leaseData, wifiData] = await Promise.all([
    resolveDhcpLeases(dhcpRes, prefs, signal),
    fetchWifiDevicesData(wifiDeviceNames, prefs, signal),
  ]);

  if (!dhcpRes.ok && !leaseData.sourceOk && !hintsRes.ok && !iwDevsRes.ok) {
    throwBatchFailure([dhcpRes, hintsRes, iwDevsRes], "Failed to read router client data");
  }

  interface ClientAccumulator {
    mac: string;
    dhcpHostname: string;
    hintHostname: string;
    dhcpIps: string[];
    hintIps: string[];
    ipv6: string[];
    hasDhcpLease: boolean;
    leaseExpiresSec: number | null;
    wifi: ClientRecord["wifi"];
  }

  const byMac = new Map<string, ClientAccumulator>();

  function getOrCreate(rawMac: string): ClientAccumulator {
    const mac = normalizeMac(rawMac);
    let acc = byMac.get(mac);
    if (!acc) {
      acc = {
        mac,
        dhcpHostname: "",
        hintHostname: "",
        dhcpIps: [],
        hintIps: [],
        ipv6: [],
        hasDhcpLease: false,
        leaseExpiresSec: null,
        wifi: null,
      };
      byMac.set(mac, acc);
    }
    return acc;
  }

  for (const lease of leaseData.allLeases) {
    if (!lease.macaddr) {
      continue;
    }
    const acc = getOrCreate(lease.macaddr);
    acc.hasDhcpLease = true;
    if (typeof lease.expires === "number") {
      const clamped = Math.max(0, lease.expires);
      acc.leaseExpiresSec = acc.leaseExpiresSec === null ? clamped : Math.max(acc.leaseExpiresSec, clamped);
    }
    const host = lease.hostname?.trim();
    if (host && host !== "*" && !acc.dhcpHostname) {
      acc.dhcpHostname = host;
    }
    if (lease.ipaddr?.trim()) {
      acc.dhcpIps.push(lease.ipaddr.trim());
    }
    if (lease.ip6addr?.trim()) {
      acc.ipv6.push(lease.ip6addr.trim());
    }
    if (Array.isArray(lease.ip6addrs)) {
      acc.ipv6.push(...lease.ip6addrs);
    }
  }

  for (const { device, info, entries } of wifiData.assocByDevice) {
    const band = formatFrequencyBand(info.frequency);
    const channel = typeof info.channel === "number" ? info.channel : null;
    const ssid = info.ssid || device;

    for (const entry of entries) {
      if (!entry.mac) {
        continue;
      }
      const acc = getOrCreate(entry.mac);
      const nextInactiveMs = typeof entry.inactive === "number" ? entry.inactive : null;
      if (!shouldReplaceWifiEntry(acc.wifi, nextInactiveMs)) {
        continue;
      }
      acc.wifi = {
        device,
        ssid,
        band,
        channel,
        signal: typeof entry.signal === "number" && entry.signal < 0 ? entry.signal : null,
        signalAvg: typeof entry.signal_avg === "number" ? entry.signal_avg : null,
        noise: typeof entry.noise === "number" ? entry.noise : null,
        connectedTimeSec: typeof entry.connected_time === "number" ? entry.connected_time : null,
        inactiveMs: nextInactiveMs,
        rxRateKbps: typeof entry.rx?.rate === "number" ? entry.rx.rate : null,
        txRateKbps: typeof entry.tx?.rate === "number" ? entry.tx.rate : null,
        rxBytes: typeof entry.rx?.bytes === "number" ? entry.rx.bytes : null,
        txBytes: typeof entry.tx?.bytes === "number" ? entry.tx.bytes : null,
        standard: formatWifiStandard(entry),
      };
    }
  }

  for (const [rawMac, hint] of Object.entries(hints)) {
    const acc = byMac.get(normalizeMac(rawMac));
    const hasIpv4 = Array.isArray(hint.ipaddrs) && hint.ipaddrs.some((ip) => Boolean(ip) && !isApiPaAddress(ip));
    const hasIpv6 =
      Array.isArray(hint.ip6addrs) &&
      hint.ip6addrs.some((ip) => {
        const trimmed = ip?.trim();
        return Boolean(trimmed) && !trimmed.toLowerCase().startsWith("fe80:");
      });
    if (!acc && !hasIpv4 && !hasIpv6) {
      continue;
    }
    const target = acc ?? getOrCreate(rawMac);
    const hintName = hint.name?.trim();
    if (hintName && hintName !== "*" && !target.hintHostname) {
      target.hintHostname = hintName;
    }
    if (Array.isArray(hint.ipaddrs)) {
      target.hintIps.push(...hint.ipaddrs);
    }
    if (Array.isArray(hint.ip6addrs)) {
      target.ipv6.push(...hint.ip6addrs);
    }
  }

  const records: ClientRecord[] = Array.from(byMac.values()).map((acc) => {
    const allIps = Array.from(new Set([...acc.dhcpIps, ...acc.hintIps].map((ip) => ip.trim()).filter(Boolean)));
    const primaryIp = pickBestIpv4(acc.dhcpIps) ?? pickBestIpv4(acc.hintIps);
    const hostname = acc.dhcpHostname || acc.hintHostname || "";
    const connectionType: ClientRecord["connectionType"] = acc.wifi ? "wifi" : acc.hasDhcpLease ? "dhcp" : "static";

    return {
      id: acc.mac,
      mac: acc.mac,
      hostname,
      ip: primaryIp,
      allIps,
      ipv6: sortAndDedupeIpv6(acc.ipv6),
      connectionType,
      hasDhcpLease: acc.hasDhcpLease,
      leaseExpiresSec: acc.leaseExpiresSec,
      wifi: acc.wifi,
    };
  });

  const typeOrder: Record<ClientRecord["connectionType"], number> = {
    wifi: 0,
    dhcp: 1,
    static: 2,
  };

  return records.sort((a, b) => {
    const typeDiff = typeOrder[a.connectionType] - typeOrder[b.connectionType];
    if (typeDiff !== 0) {
      return typeDiff;
    }
    if (a.wifi && b.wifi) {
      const sigA = a.wifi.signal ?? -999;
      const sigB = b.wifi.signal ?? -999;
      if (sigA !== sigB) {
        return sigB - sigA;
      }
    }
    const nameA = a.hostname || "~~~";
    const nameB = b.hostname || "~~~";
    const nameDiff = nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
    if (nameDiff !== 0) {
      return nameDiff;
    }
    return (a.ip ?? a.mac).localeCompare(b.ip ?? b.mac);
  });
}

function isPinnedMatch(name: string, pinnedTokens: string[], extraKeywords: string[] = []): boolean {
  const lower = name.toLowerCase();
  const extraLower = extraKeywords.map((k) => k.toLowerCase()).filter(Boolean);
  return pinnedTokens.some(
    (token) =>
      lower === token || extraLower.some((k) => k === token) || (token === "wireguard" && /^wg\d*$/i.test(lower)),
  );
}

/** Fetches OpenWrt init.d services merged with procd instances and network/VPN interfaces. */
export async function fetchServicesAndInterfaces(
  prefs: Partial<ExtensionPreferences> = {},
  signal?: AbortSignal,
): Promise<ManagedServiceItem[]> {
  const [rcRes, serviceRes, ifaceRes, devRes] = await ubusBatch(
    [
      { object: "rc", method: "list" },
      { object: "service", method: "list" },
      { object: "network.interface", method: "dump" },
      { object: "luci-rpc", method: "getNetworkDevices" },
    ],
    prefs,
    signal,
  );

  let rcMap = getBatchValue<Record<string, RcServiceEntry>>(rcRes);
  if (!rcMap) {
    const initList = await ubusCallOptional<Record<string, LuciInitEntry>>("luci", "getInitList", {}, prefs, signal);
    if (initList) {
      rcMap = {};
      for (const [name, entry] of Object.entries(initList)) {
        rcMap[name] = {
          start: entry.index,
          stop: typeof entry.stop === "number" ? entry.stop : undefined,
          enabled: Boolean(entry.enabled),
          running: undefined,
        };
      }
    }
  }

  if (!rcRes.ok && !rcMap && !serviceRes.ok && !ifaceRes.ok) {
    throwBatchFailure([rcRes, serviceRes, ifaceRes], "Failed to read router services and interfaces");
  }

  const procdMap = getBatchValue<Record<string, ProcdServiceEntry>>(serviceRes) ?? {};
  const rawIfaces = getBatchValue<{ interface?: NetworkInterfaceDumpItem[] }>(ifaceRes)?.interface ?? [];
  const networkDevices = getBatchValue<Record<string, NetworkDeviceEntry>>(devRes) ?? {};
  const pinnedTokens = parseCsvPreference(prefs.pinnedServices, DEFAULT_PINNED_SERVICES, true);

  const serviceNames = Array.from(new Set([...Object.keys(rcMap ?? {}), ...Object.keys(procdMap)])).filter(
    (name) => !BACKUP_INIT_PATTERN.test(name),
  );
  const services: ManagedInitService[] = serviceNames.map((name) => {
    const rc = rcMap?.[name];
    const procd = procdMap[name];
    const instances: ServiceInstanceSummary[] = Object.entries(procd?.instances ?? {}).map(([instName, inst]) => ({
      name: instName,
      running: Boolean(inst.running),
      pid: typeof inst.pid === "number" ? inst.pid : null,
      command: Array.isArray(inst.command) ? inst.command : [],
      respawn: inst.respawn,
    }));

    const running = rc?.running !== undefined ? Boolean(rc.running) : instances.some((inst) => inst.running);

    return {
      id: `service:${name}`,
      kind: "service",
      name,
      running,
      enabled: Boolean(rc?.enabled),
      startPriority: typeof rc?.start === "number" ? rc.start : null,
      stopPriority: typeof rc?.stop === "number" ? rc.stop : null,
      pinned: isPinnedMatch(name, pinnedTokens),
      critical: CRITICAL_SERVICES.has(name),
      instances,
    };
  });

  const interfaceSummaries = buildInterfaceSummaries(rawIfaces, networkDevices);
  const interfaces: ManagedNetworkInterface[] = interfaceSummaries.map((iface) => ({
    id: `interface:${iface.name}`,
    kind: "interface",
    name: iface.name,
    proto: iface.proto,
    device: iface.device,
    up: iface.up,
    pending: iface.pending,
    uptime: iface.uptime,
    ipv4: iface.ipv4,
    ipv6: iface.ipv6,
    gateway: iface.gateway,
    dns: iface.dns,
    rxBytes: iface.rxBytes,
    txBytes: iface.txBytes,
    isVpn: iface.isVpn,
    pinned: isPinnedMatch(iface.name, pinnedTokens, [iface.proto, iface.isVpn ? "vpn" : ""]),
    critical: CRITICAL_INTERFACES.has(iface.name),
  }));

  const sortedServices = services.sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }
    if (a.running !== b.running) {
      return a.running ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  const sortedInterfaces = interfaces.sort((a, b) => {
    if (a.isVpn !== b.isVpn) {
      return a.isVpn ? -1 : 1;
    }
    if (a.up !== b.up) {
      return a.up ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return [...sortedServices, ...sortedInterfaces];
}

/** Runs an init.d service lifecycle action via `rc.init`, falling back to `luci.setInitAction`. */
export async function runServiceAction(
  name: string,
  action: "start" | "stop" | "restart" | "reload" | "enable" | "disable",
  prefs: Partial<ExtensionPreferences> = {},
  signal?: AbortSignal,
): Promise<void> {
  const safeName = validateIdentifier(name, "service name");
  try {
    await ubusCall("rc", "init", { name: safeName, action }, prefs, signal, 20_000);
  } catch (err) {
    if (err instanceof OpenWrtError && err.code === "NOT_FOUND") {
      await ubusCall("luci", "setInitAction", { name: safeName, action }, prefs, signal, 20_000);
      return;
    }
    throw err;
  }
}

/** Brings a network/VPN interface up, down, or restarts it via `network.interface.<name>`. */
export async function runInterfaceAction(
  name: string,
  action: "up" | "down" | "restart",
  prefs: Partial<ExtensionPreferences> = {},
  signal?: AbortSignal,
): Promise<void> {
  const safeName = validateIdentifier(name, "interface name");
  if (safeName === "lan" && action === "restart") {
    await runServiceAction("network", "reload", prefs, signal);
    return;
  }
  const ubusObject = `network.interface.${safeName}`;
  if (action === "restart") {
    await ubusCall(ubusObject, "down", {}, prefs, signal, 15_000);
    await new Promise((resolve) => setTimeout(resolve, 400));
    await ubusCall(ubusObject, "up", {}, prefs, undefined, 15_000);
    return;
  }
  await ubusCall(ubusObject, action, {}, prefs, signal, 15_000);
}

/** Deauthenticates and briefly disconnects a Wi-Fi client via `hostapd.<device>.del_client`. */
export async function disconnectWifiClient(
  device: string,
  mac: string,
  prefs: Partial<ExtensionPreferences> = {},
  signal?: AbortSignal,
): Promise<void> {
  const safeDevice = validateIdentifier(device, "wireless device");
  const normalizedMac = mac.trim().toLowerCase();
  if (!MAC_ADDRESS_PATTERN.test(normalizedMac)) {
    throw new OpenWrtError("RPC_ERROR", `Invalid MAC address "${mac}".`);
  }
  await ubusCall(
    `hostapd.${safeDevice}`,
    "del_client",
    {
      addr: normalizedMac,
      reason: 5,
      deauth: true,
      ban_time: 1000,
    },
    prefs,
    signal,
  );
}

/** Reboots the OpenWrt router via `system.reboot`. */
export async function rebootRouter(prefs: Partial<ExtensionPreferences> = {}, signal?: AbortSignal): Promise<void> {
  await ubusCall("system", "reboot", {}, prefs, signal);
}

async function execRouterCommand(
  command: string,
  params: string[],
  prefs: Partial<ExtensionPreferences>,
  signal?: AbortSignal,
  timeoutMs = 15_000,
): Promise<FileExecResult> {
  try {
    return await ubusCall<FileExecResult>("file", "exec", { command, params }, prefs, signal, timeoutMs);
  } catch (err) {
    if (err instanceof OpenWrtError && (err.code === "NOT_FOUND" || err.code === "PERMISSION_DENIED")) {
      throw new OpenWrtError(
        "EXEC_UNAVAILABLE",
        `Unable to run ${command} via ubus file.exec (${err.message}). Ensure rpcd-mod-file and ACL permissions are enabled.`,
      );
    }
    throw err;
  }
}

/** Reads recent syslog lines matching a service name via `logread`. */
export async function fetchServiceLogs(
  serviceName: string,
  prefs: Partial<ExtensionPreferences> = {},
  signal?: AbortSignal,
): Promise<string> {
  const safeName = validateIdentifier(serviceName, "service name");
  const res = await execRouterCommand("/sbin/logread", ["-l", "100", "-e", safeName], prefs, signal);
  const output = (res.stdout || res.stderr || "").trim();
  return output || `No recent logread entries matched "${safeName}".`;
}

/** Reads live WireGuard peer state using `wg show <iface> dump`, returning `null` if unavailable. */
export async function fetchWireGuardPeers(
  interfaceName: string,
  prefs: Partial<ExtensionPreferences> = {},
  signal?: AbortSignal,
): Promise<WireGuardPeer[] | null> {
  const safeName = validateIdentifier(interfaceName, "interface name");
  if (safeName === "all" || safeName === "interfaces") {
    throw new OpenWrtError("RPC_ERROR", `Invalid WireGuard interface name "${interfaceName}".`);
  }
  const res = await ubusCallOptional<FileExecResult>(
    "file",
    "exec",
    { command: "/usr/bin/wg", params: ["show", safeName, "dump"] },
    prefs,
    signal,
  );

  if (!res || res.code !== 0 || !res.stdout) {
    return null;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const peers: WireGuardPeer[] = [];

  for (const rawLine of res.stdout.split(/\r?\n/)) {
    const line = rawLine.replace(/\r$/, "");
    if (line.trim().length === 0) {
      continue;
    }
    const cols = line.split("\t");
    // Interface line has 4 columns; single-interface peer lines have exactly 8 columns.
    if (cols.length !== 8) {
      continue;
    }
    const latestHandshakeEpoch = Number(cols[4]);
    const rxBytes = Number(cols[5]);
    const txBytes = Number(cols[6]);

    peers.push({
      publicKey: cols[0],
      endpoint: cols[2] && cols[2] !== "(none)" ? cols[2] : null,
      allowedIps: cols[3] && cols[3] !== "(none)" ? cols[3] : "",
      latestHandshakeSec:
        Number.isFinite(latestHandshakeEpoch) && latestHandshakeEpoch > 0
          ? Math.max(0, nowSec - latestHandshakeEpoch)
          : null,
      rxBytes: Number.isFinite(rxBytes) ? rxBytes : 0,
      txBytes: Number.isFinite(txBytes) ? txBytes : 0,
      keepalive: cols[7] && cols[7] !== "off" ? cols[7] : null,
    });
  }

  return peers;
}

/** Runs `ping` directly from the OpenWrt router and parses loss and RTT stats. */
export async function pingFromRouter(
  target: string,
  count = 3,
  prefs: Partial<ExtensionPreferences> = {},
  signal?: AbortSignal,
): Promise<PingResult> {
  const safeTarget = validateTargetHost(target);
  const safeCount = Number.isFinite(count) ? count : 3;
  const clampedCount = Math.min(Math.max(Math.round(safeCount), 1), 10);
  const res = await execRouterCommand(
    "/bin/ping",
    ["-c", String(clampedCount), "-W", "2", safeTarget],
    prefs,
    signal,
    Math.max(10_000, clampedCount * 3_000),
  );

  const rawOutput = [res.stdout, res.stderr].filter(Boolean).join("\n").trim();
  const pktMatch = rawOutput.match(
    /(\d+)\s+packets?\s+transmitted,\s+(\d+)\s+(?:packets?\s+)?received.*?(?:\s|,)(\d+(?:\.\d+)?)%\s+packet\s+loss/i,
  );
  const rttMatch = rawOutput.match(/min\/avg\/max(?:\s*\/\s*\w+)?\s*=\s*([\d.]+)\/([\d.]+)\/([\d.]+)/i);

  const transmitted = pktMatch ? Number(pktMatch[1]) : clampedCount;
  const received = pktMatch ? Number(pktMatch[2]) : res.code === 0 ? clampedCount : 0;
  const rawLoss = pktMatch ? Number(pktMatch[3]) : res.code === 0 ? 0 : 100;
  const lossPercent = Number.isFinite(rawLoss)
    ? Math.min(Math.max(Math.round(rawLoss), 0), 100)
    : res.code === 0
      ? 0
      : 100;

  return {
    target: safeTarget,
    reachable: received > 0 && lossPercent < 100,
    transmitted,
    received,
    lossPercent,
    minMs: rttMatch ? Number(rttMatch[1]) : null,
    avgMs: rttMatch ? Number(rttMatch[2]) : null,
    maxMs: rttMatch ? Number(rttMatch[3]) : null,
    rawOutput: rawOutput || `ping exited with code ${res.code}`,
  };
}

/** Runs `nslookup` against the router's local DNS resolver (127.0.0.1). */
export async function dnsLookupFromRouter(
  domain: string,
  prefs: Partial<ExtensionPreferences> = {},
  signal?: AbortSignal,
): Promise<DnsLookupResult> {
  const safeDomain = validateTargetHost(domain);
  const start = Date.now();
  const res = await execRouterCommand("/usr/bin/nslookup", [safeDomain, "127.0.0.1"], prefs, signal, 10_000);
  const latencyMs = Date.now() - start;
  const rawOutput = [res.stdout, res.stderr].filter(Boolean).join("\n").trim();

  const addresses: string[] = [];
  let seenAnswerName = false;
  for (const rawLine of rawOutput.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (/^Name:/i.test(line)) {
      seenAnswerName = true;
      continue;
    }
    const ptrMatch = line.match(/\bname\s*=\s*([^\s]+?)\.?$/i);
    if (ptrMatch && ptrMatch[1] && ptrMatch[1] !== ".") {
      if (!addresses.includes(ptrMatch[1])) {
        addresses.push(ptrMatch[1]);
      }
      continue;
    }
    if (!seenAnswerName) {
      continue;
    }
    const addrMatch = line.match(/^Address(?:\s+\d+)?:\s+([^\s]+)(?:\s|$)/i);
    if (addrMatch && addrMatch[1]) {
      const candidate = addrMatch[1].replace(/#\d+$/, "");
      if (candidate && !addresses.includes(candidate)) {
        addresses.push(candidate);
      }
    }
  }

  return {
    domain: safeDomain,
    resolved: res.code === 0 && addresses.length > 0,
    addresses,
    latencyMs,
    rawOutput: rawOutput || `nslookup exited with code ${res.code}`,
  };
}

/** Runs parallel router, WAN, Wi-Fi, pinned service, DNS, and LAN/WAN ping health checks. */
export async function runQuickStatusChecks(
  prefs: Partial<ExtensionPreferences> = {},
  signal?: AbortSignal,
): Promise<StatusCheckItem[]> {
  const dnsDomain = prefs.dnsTestDomain?.trim() || DEFAULT_DNS_TEST_DOMAIN;
  const configuredTargets = parseCsvPreference(prefs.pingTargets, DEFAULT_PING_TARGETS, false);

  const statusStart = Date.now();
  const [statusResult, servicesResult, dnsResult] = await Promise.allSettled([
    fetchRouterStatus(prefs, signal),
    fetchServicesAndInterfaces(prefs, signal),
    dnsLookupFromRouter(dnsDomain, prefs, signal),
  ]);
  if (signal?.aborted) {
    throw createAbortError(signal);
  }
  if (
    statusResult.status === "rejected" &&
    ((statusResult.reason instanceof OpenWrtError && FATAL_STATUS_ERROR_CODES.has(statusResult.reason.code)) ||
      (servicesResult.status === "rejected" && dnsResult.status === "rejected"))
  ) {
    throw statusResult.reason;
  }
  const statusLatency = Date.now() - statusStart;

  const checks: StatusCheckItem[] = [];
  const pingTargetList = [...configuredTargets];

  if (statusResult.status === "fulfilled") {
    const snap = statusResult.value;
    const validLoad = Array.isArray(snap.info.load) && snap.info.load.length === 3 ? snap.info.load : undefined;
    const load1 = validLoad && Number.isFinite(validLoad[0]) ? (validLoad[0] / 65536).toFixed(2) : null;
    const loadNum = load1 !== null ? Number(load1) : 0;
    const memory = snap.info.memory;
    const memAvailable = memory.available ?? memory.free + (memory.buffered ?? 0) + (memory.cached ?? 0);
    const memUsed = Math.max(0, memory.total - memAvailable);
    const memPct = Math.round((memUsed / Math.max(memory.total, 1)) * 100);
    const rootMount = snap.info.root;
    const rootPct = rootMount ? Math.round((rootMount.used / Math.max(rootMount.total, 1)) * 100) : 0;
    const ctPct = snap.conntrack ? Math.round((snap.conntrack.count / Math.max(snap.conntrack.max, 1)) * 100) : 0;

    const routerRows: Array<[string, string]> = [
      ["Firmware", snap.board.release?.description || snap.board.release?.version || "OpenWrt"],
      ["Uptime", formatDuration(snap.info.uptime)],
      ["Load Average", formatLoadAverage(validLoad)],
      ["Memory Used", `${formatBytes(memUsed)} / ${formatBytes(memory.total)} (${memPct}%)`],
    ];
    if (rootMount) {
      routerRows.push([
        "Overlay Storage",
        `${formatBytes(rootMount.used * 1024)} / ${formatBytes(rootMount.total * 1024)} (${rootPct}%)`,
      ]);
    }
    if (snap.conntrack) {
      routerRows.push([
        "Conntrack",
        `${snap.conntrack.count.toLocaleString()} / ${snap.conntrack.max.toLocaleString()} (${ctPct}%)`,
      ]);
    }
    if (snap.tempInfo) {
      routerRows.push(["Temperatures", snap.tempInfo]);
    }

    const routerWarn = loadNum >= 4 || memPct >= 95 || rootPct >= 92 || ctPct >= 90;
    checks.push({
      id: "check:router-health",
      title: `Router Health (${snap.board.hostname})`,
      category: "router",
      status: routerWarn ? "warn" : "pass",
      summary: `Up ${formatDuration(snap.info.uptime)} · Load ${formatLoadAverage(validLoad)} · RAM ${memPct}%`,
      latencyMs: statusLatency,
      detailMarkdown: [
        `### ${escapeMarkdownText(snap.board.hostname)} (${escapeMarkdownText(snap.board.model)})`,
        "",
        buildKeyValueTable(routerRows),
      ].join("\n"),
    });

    const wan =
      snap.interfaces.find((i) => i.name === "wan") ??
      snap.interfaces.find((i) => i.name === "wwan" || i.name === "wan6");
    if (wan) {
      if (
        wan.gateway &&
        wan.gateway !== "0.0.0.0" &&
        wan.gateway !== "::" &&
        !wan.gateway.toLowerCase().startsWith("fe80:") &&
        !pingTargetList.includes(wan.gateway)
      ) {
        pingTargetList.push(wan.gateway);
      }
      const wanIp = wan.ipv4[0] || wan.ipv6[0] || "No IP";
      const wanRows: Array<[string, string]> = [
        ["State", `${wan.up ? "✓ Up" : "○ Down"} (${wan.proto})`],
        ["Device", wan.device ? inlineCode(wan.device) : "Unknown"],
        ["IPv4", wan.ipv4.length > 0 ? wan.ipv4.map((ip) => inlineCode(ip)).join(", ") : "None"],
      ];
      if (wan.ipv6.length > 0) {
        wanRows.push(["IPv6", wan.ipv6.map((ip) => inlineCode(ip)).join(", ")]);
      }
      wanRows.push(["Gateway", wan.gateway ? inlineCode(wan.gateway) : "None"]);
      wanRows.push(["Uptime", formatDuration(wan.uptime)]);
      if (wan.linkSpeedMbps) {
        wanRows.push(["Link Speed", `${wan.linkSpeedMbps} Mbps`]);
      }
      if (wan.rxBytes !== null && wan.txBytes !== null) {
        wanRows.push(["Traffic", `↓ ${formatBytes(wan.rxBytes)} / ↑ ${formatBytes(wan.txBytes)}`]);
      }

      checks.push({
        id: "check:wan",
        title: "WAN Uplink",
        category: "network",
        status: wan.up && (wan.ipv4.length > 0 || wan.ipv6.length > 0) ? "pass" : "fail",
        summary: wan.up
          ? `${wanIp}${wan.gateway ? ` · GW ${wan.gateway}` : ""}${wan.linkSpeedMbps ? ` · ${wan.linkSpeedMbps} Mbps` : ""}`
          : "WAN interface is down",
        latencyMs: null,
        detailMarkdown: [`### WAN Interface (${inlineCode(wan.name)})`, "", buildKeyValueTable(wanRows)].join("\n"),
      });
    }

    if (snap.radios.length > 0) {
      const radioSummary = snap.radios.map((r) => `${r.ssid} (${r.band}, ${r.stationCount})`).join(" · ");
      const radioRows = snap.radios.map((r) => [
        `**${escapeMarkdownText(r.ssid)}** (${inlineCode(r.device)})`,
        `${r.band} · ${r.channel ? `Ch ${r.channel}` : "?"}`,
        r.mode,
        String(r.stationCount),
      ]);
      checks.push({
        id: "check:wifi",
        title: "Wi-Fi Radios",
        category: "wifi",
        status: snap.radios.every((r) => Boolean(r.channel)) ? "pass" : "warn",
        summary: `${snap.wifiClientCount} clients · ${radioSummary}`,
        latencyMs: null,
        detailMarkdown: [
          "### Wireless Radios",
          "",
          buildMarkdownTable(["SSID", "Band / Ch", "Mode", "Clients"], radioRows),
        ].join("\n"),
      });
    }
  } else {
    const errMsg = statusResult.reason instanceof Error ? statusResult.reason.message : String(statusResult.reason);
    checks.push({
      id: "check:router-health",
      title: "Router Health",
      category: "router",
      status: "fail",
      summary: errMsg,
      latencyMs: statusLatency,
      detailMarkdown: `### Router Check Failed\n\n${errMsg}`,
    });
  }

  if (servicesResult.status === "fulfilled") {
    const pinnedItems = servicesResult.value.filter((item) => item.pinned);
    const activeCount = pinnedItems.filter((item) => (item.kind === "service" ? item.running : item.up)).length;
    const inactive = pinnedItems.filter((item) => !(item.kind === "service" ? item.running : item.up));

    const status: StatusCheckItem["status"] =
      pinnedItems.length === 0 ? "warn" : inactive.length === 0 ? "pass" : "warn";

    const serviceRows = pinnedItems.map((item) => {
      const isUp = item.kind === "service" ? item.running : item.up;
      const typeLabel = item.kind === "service" ? "Service" : `Interface (${item.proto})`;
      const statusLabel = item.kind === "service" ? (isUp ? "✓ Running" : "○ Stopped") : isUp ? "✓ Up" : "○ Down";
      return [inlineCode(item.name), typeLabel, statusLabel];
    });

    checks.push({
      id: "check:pinned-services",
      title: "Pinned Services & VPN",
      category: "services",
      status,
      summary:
        pinnedItems.length === 0
          ? "No matching pinned services found"
          : inactive.length === 0
            ? `All ${activeCount} pinned items active`
            : `${activeCount}/${pinnedItems.length} active · Down: ${inactive.map((i) => i.name).join(", ")}`,
      latencyMs: null,
      detailMarkdown: [
        "### Pinned Services & VPN Interfaces",
        "",
        pinnedItems.length > 0
          ? buildMarkdownTable(["Name", "Type", "Status"], serviceRows)
          : "_No services matched your Pinned Services preference._",
      ].join("\n"),
    });
  } else {
    const errMsg =
      servicesResult.reason instanceof Error ? servicesResult.reason.message : String(servicesResult.reason);
    checks.push({
      id: "check:pinned-services",
      title: "Pinned Services & VPN",
      category: "services",
      status: "fail",
      summary: errMsg,
      latencyMs: null,
      detailMarkdown: `### Pinned Services Check Failed\n\n${errMsg}`,
    });
  }

  if (dnsResult.status === "fulfilled") {
    const dns = dnsResult.value;
    checks.push({
      id: "check:dns",
      title: `DNS Lookup (${dns.domain})`,
      category: "dns",
      status: dns.resolved ? "pass" : "fail",
      summary: dns.resolved
        ? `${dns.addresses.slice(0, 2).join(", ")} (${dns.latencyMs} ms)`
        : `Failed to resolve ${dns.domain} via 127.0.0.1`,
      latencyMs: dns.latencyMs,
      target: dns.domain,
      detailMarkdown: formatDnsMarkdown(`Router Local DNS Check (${inlineCode(dns.domain)})`, dns),
    });
  } else {
    const errMsg = dnsResult.reason instanceof Error ? dnsResult.reason.message : String(dnsResult.reason);
    checks.push({
      id: "check:dns",
      title: `DNS Lookup (${dnsDomain})`,
      category: "dns",
      status: "fail",
      summary: errMsg,
      latencyMs: null,
      target: dnsDomain,
      detailMarkdown: `### DNS Check Failed\n\n${errMsg}`,
    });
  }

  const pingResults = await Promise.allSettled(
    pingTargetList.map(async (target) => ({
      target,
      result: await pingFromRouter(target, 3, prefs, signal),
    })),
  );
  if (signal?.aborted) {
    throw createAbortError(signal);
  }

  for (let i = 0; i < pingTargetList.length; i += 1) {
    const target = pingTargetList[i];
    const settled = pingResults[i];
    if (settled.status === "fulfilled") {
      const res = settled.value.result;
      const status: StatusCheckItem["status"] = !res.reachable ? "fail" : res.lossPercent > 0 ? "warn" : "pass";
      checks.push({
        id: `check:ping:${target}`,
        title: `Ping ${target}`,
        category: "ping",
        status,
        summary: res.reachable
          ? `${res.received}/${res.transmitted} rx · ${res.lossPercent}% loss${res.avgMs !== null ? ` · avg ${res.avgMs.toFixed(1)} ms` : ""}`
          : `Unreachable (${res.lossPercent}% packet loss)`,
        latencyMs: res.avgMs !== null ? Math.round(res.avgMs) : null,
        target,
        detailMarkdown: formatPingMarkdown(`Ping ${target} from Router`, res),
      });
    } else {
      const errMsg = settled.reason instanceof Error ? settled.reason.message : String(settled.reason);
      checks.push({
        id: `check:ping:${target}`,
        title: `Ping ${target}`,
        category: "ping",
        status: "fail",
        summary: errMsg,
        latencyMs: null,
        target,
        detailMarkdown: `### Ping ${target} Failed\n\n${errMsg}`,
      });
    }
  }

  return checks;
}

/** Formats a ping result as a table + raw output code block. */
export function formatPingMarkdown(heading: string, res: PingResult): string {
  const rows: Array<[string, string]> = [
    ["Packets", `${res.received}/${res.transmitted} received (${res.lossPercent}% loss)`],
  ];
  if (res.minMs !== null && res.avgMs !== null && res.maxMs !== null) {
    rows.push(["RTT (min/avg/max)", `${res.minMs} / ${res.avgMs} / ${res.maxMs} ms`]);
  }
  return [`### ${heading}`, "", buildKeyValueTable(rows), "", buildSafeCodeBlock(res.rawOutput)].join("\n");
}

/** Formats a local DNS lookup result as a table + raw output code block. */
export function formatDnsMarkdown(heading: string, res: DnsLookupResult): string {
  const rows: Array<[string, string]> = [
    ["Status", res.resolved ? "✓ Resolved" : "✗ Failed"],
    ["Latency", `${res.latencyMs} ms`],
    ["Addresses", res.addresses.length > 0 ? res.addresses.map((a) => inlineCode(a)).join(", ") : "None"],
  ];
  return [`### ${heading}`, "", buildKeyValueTable(rows), "", buildSafeCodeBlock(res.rawOutput)].join("\n");
}
