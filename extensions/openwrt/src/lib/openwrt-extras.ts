import { isIP, isIPv4 } from "node:net";
import { formatFrequencyBand } from "./format";
import { fetchClients, runServiceAction, validateIdentifier } from "./openwrt";
import type {
  ClientRecord,
  ConntrackEntry,
  DhcpDnsSnapshot,
  ExtensionPreferences,
  FileExecResult,
  FirewallRedirect,
  FirewallUpnpSnapshot,
  IwinfoAssocEntry,
  IwinfoInfo,
  LocalDnsRecord,
  RouterProcessEntry,
  StaticDhcpLease,
  SyslogEntry,
  SyslogSeverity,
  UpnpRule,
  WifiBand,
  WifiInterfaceConfig,
  WifiScanResult,
} from "./types";
import {
  OpenWrtError,
  type UbusBatchItemResult,
  type UbusCallSpec,
  createAbortError,
  ubusBatch,
  ubusCall,
  ubusCallOptional,
} from "./ubus";

const MAC_ADDRESS_PATTERN = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/;
const RFC1123_LABEL_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
const LEASETIME_PATTERN = /^(\d+)([smhdw]?)$/i;
const MIN_LEASETIME_SECONDS = 120;
const PORT_RANGE_PATTERN = /^(\d{1,5})(?:-(\d{1,5}))?$/;
const ALLOWED_FIREWALL_PROTOS = new Set(["tcp", "udp", "tcp udp", "all"]);
const PORT_CAPABLE_PROTOS = new Set(["tcp", "udp", "tcp udp"]);
const UPNP_TOKEN_PATTERN = /^[1-9]\d*$/;
const MAX_LINUX_PID = 4_194_304;
const SYSLOG_HEADER_PATTERN =
  /^(\S.*?\s+\d{2}:\d{2}:\d{2}(?:\s+\d{4}|[^\s]*)?)\s+([a-z0-9_-]+)\.(emerg|alert|crit|err|warning|warn|notice|info|debug)\s+(.*)$/i;
const SYSLOG_DAEMON_PATTERN = /^([^\s:[]+)(?:\[(\d+)\])?:\s*(.*)$/;

type UciSectionMap = Record<string, Record<string, unknown>>;

function isPermissionDeniedCode(statusCode: number): boolean {
  return statusCode === 6 || statusCode === -32002;
}

function getBatchValue<T>(item: UbusBatchItemResult | undefined): T | null {
  if (!item || !item.ok) {
    return null;
  }
  return item.data as T;
}

function throwBatchError(item: UbusBatchItemResult | undefined, context: string): never {
  if (!item || item.ok) {
    throw new OpenWrtError("RPC_ERROR", `${context}: unknown ubus error.`);
  }
  if (isPermissionDeniedCode(item.statusCode)) {
    throw new OpenWrtError("PERMISSION_DENIED", `${context}: ${item.message}.`);
  }
  if (item.statusCode === 3 || item.statusCode === 4) {
    throw new OpenWrtError("NOT_FOUND", `${context}: ${item.message}.`);
  }
  throw new OpenWrtError("RPC_ERROR", `${context}: ${item.message}.`);
}

function stringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function rawStringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseUciBool(value: unknown, defaultValue = false): boolean {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on") {
      return true;
    }
    if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") {
      return false;
    }
  }
  return defaultValue;
}

function parsePositiveInt(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) {
      return null;
    }
    const parsed = Number.parseInt(trimmed, 10);
    return parsed > 0 ? parsed : null;
  }
  return null;
}

function parseNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return fallback;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function parseOptionalPort(value: unknown): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const num = parseNumber(value, Number.NaN);
  return Number.isInteger(num) && num >= 0 && num <= 65535 ? num : null;
}

interface ParsedPortSpec {
  text: string;
  start: number;
  end: number;
  isRange: boolean;
}

function validatePortSpec(raw: string, label: string): ParsedPortSpec {
  const trimmed = raw.trim();
  const match = PORT_RANGE_PATTERN.exec(trimmed);
  if (!match) {
    throw new OpenWrtError("RPC_ERROR", `Invalid ${label} "${raw}". Use a port (1-65535) or range (e.g. 8000-8010).`);
  }
  const start = Number(match[1]);
  if (!Number.isInteger(start) || start < 1 || start > 65535) {
    throw new OpenWrtError("RPC_ERROR", `Invalid ${label} "${raw}". Port numbers must be between 1 and 65535.`);
  }
  if (match[2] !== undefined) {
    const end = Number(match[2]);
    if (!Number.isInteger(end) || end < 1 || end > 65535 || end < start) {
      throw new OpenWrtError("RPC_ERROR", `Invalid ${label} range "${raw}".`);
    }
    return { text: trimmed, start, end, isRange: true };
  }
  return { text: trimmed, start, end: start, isRange: false };
}

function validateRfc1123Hostname(raw: string, label = "hostname"): string {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 253 || isIPv4(trimmed)) {
    throw new OpenWrtError("RPC_ERROR", `Invalid ${label} "${raw}". Enter a valid RFC 1123 hostname.`);
  }
  const parts = trimmed.split(".");
  if (parts.some((part) => !RFC1123_LABEL_PATTERN.test(part))) {
    throw new OpenWrtError(
      "RPC_ERROR",
      `Invalid ${label} "${raw}". Labels must be 1-63 alphanumeric or hyphen characters and cannot start or end with a hyphen.`,
    );
  }
  return trimmed;
}

function normalizeAndValidateMac(raw: string): string {
  const normalized = raw.trim().replace(/-/g, ":").toUpperCase();
  if (!normalized || !MAC_ADDRESS_PATTERN.test(normalized)) {
    throw new OpenWrtError("RPC_ERROR", `Invalid MAC address "${raw}". Expected AA:BB:CC:DD:EE:FF format.`);
  }
  if (normalized === "00:00:00:00:00:00") {
    throw new OpenWrtError("RPC_ERROR", `Invalid MAC address "${raw}". Zero MAC address is not allowed.`);
  }
  const firstOctet = Number.parseInt(normalized.slice(0, 2), 16);
  if ((firstOctet & 1) !== 0) {
    throw new OpenWrtError("RPC_ERROR", `Invalid MAC address "${raw}". Multicast and broadcast MACs are not allowed.`);
  }
  return normalized;
}

function validateLeaseTime(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === "infinite") {
    return "infinite";
  }
  const match = LEASETIME_PATTERN.exec(trimmed);
  if (!match) {
    throw new OpenWrtError(
      "RPC_ERROR",
      `Invalid lease time "${raw}". Use a duration such as 12h, 30m, 3600, or infinite.`,
    );
  }
  const amount = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multiplier = unit === "w" ? 604_800 : unit === "d" ? 86_400 : unit === "h" ? 3_600 : unit === "m" ? 60 : 1;
  const totalSeconds = amount * multiplier;
  if (!Number.isFinite(totalSeconds) || totalSeconds < MIN_LEASETIME_SECONDS) {
    throw new OpenWrtError(
      "RPC_ERROR",
      `Invalid lease time "${raw}". Lease time must be at least ${MIN_LEASETIME_SECONDS} seconds (2m) or "infinite".`,
    );
  }
  return trimmed;
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

async function verifyUciSection(
  config: string,
  section: string,
  expectedTypes: string | string[],
  expected: { name?: string; ip?: string } | undefined,
  prefs: Partial<ExtensionPreferences>,
  signal?: AbortSignal,
): Promise<void> {
  const res = await ubusCall<{ values?: Record<string, unknown> }>("uci", "get", { config, section }, prefs, signal);
  const values = res.values;
  if (!values || typeof values !== "object") {
    throw new OpenWrtError("NOT_FOUND", `UCI section "${section}" was not found in ${config}.`);
  }

  const allowedTypes = Array.isArray(expectedTypes) ? expectedTypes : [expectedTypes];
  const actualType = stringOrEmpty(values[".type"]);
  if (!allowedTypes.includes(actualType)) {
    throw new OpenWrtError(
      "RPC_ERROR",
      `UCI section "${section}" has unexpected type "${actualType || "unknown"}" (expected ${allowedTypes.join(" or ")}).`,
    );
  }

  if (expected?.ip !== undefined && stringOrEmpty(values.ip) !== expected.ip.trim()) {
    throw new OpenWrtError(
      "RPC_ERROR",
      `Stale UCI section "${section}": expected IP "${expected.ip}", found "${stringOrEmpty(values.ip)}". Refresh and try again.`,
    );
  }
  if (expected?.name !== undefined && stringOrEmpty(values.name) !== expected.name.trim()) {
    throw new OpenWrtError(
      "RPC_ERROR",
      `Stale UCI section "${section}": expected name "${expected.name}", found "${stringOrEmpty(values.name)}". Refresh and try again.`,
    );
  }
}

async function commitAndReloadUci(
  config: "dhcp" | "firewall" | "wireless",
  prefs: Partial<ExtensionPreferences>,
  reloadFn: () => Promise<void>,
): Promise<void> {
  try {
    await ubusCall("uci", "commit", { config }, prefs, undefined);
  } catch (err) {
    await ubusCallOptional("uci", "revert", { config }, prefs, undefined).catch(() => {});
    throw err;
  }
  await reloadFn();
}

function normalizeMacList(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .filter((entry): entry is string => typeof entry === "string")
      .flatMap((entry) => entry.split(/\s+/))
      .map((entry) => entry.trim().replace(/-/g, ":").toUpperCase())
      .filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw
      .split(/\s+/)
      .map((entry) => entry.trim().replace(/-/g, ":").toUpperCase())
      .filter(Boolean);
  }
  return [];
}

/** Fetches static DHCP host reservations and local DNS domain overrides from UCI `dhcp`. */
export async function fetchDhcpDnsConfig(
  prefs: Partial<ExtensionPreferences> = {},
  signal?: AbortSignal,
): Promise<DhcpDnsSnapshot> {
  const res = await ubusCall<{ values?: UciSectionMap }>("uci", "get", { config: "dhcp" }, prefs, signal);
  const values = res.values ?? {};
  const staticLeases: StaticDhcpLease[] = [];
  const dnsRecords: LocalDnsRecord[] = [];

  for (const [section, raw] of Object.entries(values)) {
    const type = raw[".type"];
    if (type === "host") {
      staticLeases.push({
        section,
        name: stringOrEmpty(raw.name),
        macs: normalizeMacList(raw.mac),
        ip: stringOrEmpty(raw.ip),
        leasetime: stringOrEmpty(raw.leasetime) || null,
        hostid: stringOrEmpty(raw.hostid) || null,
      });
    } else if (type === "domain") {
      dnsRecords.push({
        section,
        name: stringOrEmpty(raw.name),
        ip: stringOrEmpty(raw.ip),
      });
    }
  }

  return { staticLeases, dnsRecords };
}

/** Adds a static DHCP lease (`host` section) in UCI `dhcp`, commits, and reloads dnsmasq. */
export async function addStaticDhcpLease(
  input: { name: string; mac: string; ip: string; leasetime?: string },
  prefs: Partial<ExtensionPreferences> = {},
  signal?: AbortSignal,
): Promise<void> {
  const name = validateRfc1123Hostname(input.name, "hostname");
  const mac = normalizeAndValidateMac(input.mac);
  const ip = input.ip.trim();
  if (!isIPv4(ip)) {
    throw new OpenWrtError("RPC_ERROR", `Invalid IPv4 address "${input.ip}".`);
  }

  const values: Record<string, string> = { name, mac, ip };
  const rawLeaseTime = input.leasetime?.trim();
  if (rawLeaseTime) {
    values.leasetime = validateLeaseTime(rawLeaseTime);
  }

  const existing = await fetchDhcpDnsConfig(prefs, signal);
  const duplicateIp = existing.staticLeases.find((lease) => lease.ip === ip);
  if (duplicateIp) {
    throw new OpenWrtError(
      "RPC_ERROR",
      `A static DHCP lease for IP ${ip} already exists (${duplicateIp.name || duplicateIp.section}).`,
    );
  }
  const duplicateMac = existing.staticLeases.find((lease) => lease.macs.includes(mac));
  if (duplicateMac) {
    throw new OpenWrtError(
      "RPC_ERROR",
      `A static DHCP lease for MAC ${mac} already exists (${duplicateMac.name || duplicateMac.section}).`,
    );
  }

  await ubusCall("uci", "add", { config: "dhcp", type: "host", values }, prefs, signal);
  await commitAndReloadUci("dhcp", prefs, () => runServiceAction("dnsmasq", "reload", prefs, undefined));
}

/** Deletes a static DHCP lease section from UCI `dhcp`, commits, and reloads dnsmasq. */
export async function deleteStaticDhcpLease(
  section: string,
  prefs: Partial<ExtensionPreferences> = {},
  signal?: AbortSignal,
  expected?: { ip?: string; name?: string },
): Promise<void> {
  const safeSection = validateIdentifier(section, "UCI section");
  await verifyUciSection("dhcp", safeSection, "host", expected, prefs, signal);
  await ubusCall("uci", "delete", { config: "dhcp", section: safeSection }, prefs, signal);
  await commitAndReloadUci("dhcp", prefs, () => runServiceAction("dnsmasq", "reload", prefs, undefined));
}

/** Adds a local DNS override (`domain` section) in UCI `dhcp`, commits, and reloads dnsmasq. */
export async function addLocalDnsRecord(
  input: { name: string; ip: string },
  prefs: Partial<ExtensionPreferences> = {},
  signal?: AbortSignal,
): Promise<void> {
  const name = validateRfc1123Hostname(input.name, "domain name");
  const ip = input.ip.trim();
  if (isIP(ip) === 0) {
    throw new OpenWrtError("RPC_ERROR", `Invalid IP address "${input.ip}".`);
  }

  await ubusCall("uci", "add", { config: "dhcp", type: "domain", values: { name, ip } }, prefs, signal);
  await commitAndReloadUci("dhcp", prefs, () => runServiceAction("dnsmasq", "reload", prefs, undefined));
}

/** Deletes a local DNS override section from UCI `dhcp`, commits, and reloads dnsmasq. */
export async function deleteLocalDnsRecord(
  section: string,
  prefs: Partial<ExtensionPreferences> = {},
  signal?: AbortSignal,
  expected?: { name?: string; ip?: string },
): Promise<void> {
  const safeSection = validateIdentifier(section, "UCI section");
  await verifyUciSection("dhcp", safeSection, "domain", expected, prefs, signal);
  await ubusCall("uci", "delete", { config: "dhcp", section: safeSection }, prefs, signal);
  await commitAndReloadUci("dhcp", prefs, () => runServiceAction("dnsmasq", "reload", prefs, undefined));
}

function resolveBandFromChannel(channel: number | null): WifiBand {
  if (channel === null) {
    return "Unknown";
  }
  if (channel >= 1 && channel <= 14) {
    return "2.4 GHz";
  }
  if (channel >= 32 && channel <= 177) {
    return "5 GHz";
  }
  if (channel >= 181 && channel <= 233) {
    return "6 GHz";
  }
  return "Unknown";
}

function resolveUciBand(radio: Record<string, unknown> | undefined, channel: number | null): WifiBand {
  const band = stringOrEmpty(radio?.band).toLowerCase();
  if (band === "2g" || band === "2.4g") {
    return "2.4 GHz";
  }
  if (band === "5g") {
    return "5 GHz";
  }
  if (band === "6g") {
    return "6 GHz";
  }

  const hwmode = stringOrEmpty(radio?.hwmode).toLowerCase();
  if (hwmode.includes("a") && !hwmode.includes("g")) {
    return "5 GHz";
  }
  if (hwmode.includes("g") || hwmode.includes("b")) {
    return "2.4 GHz";
  }

  return resolveBandFromChannel(channel);
}

function guessRadioPhy(deviceName: string): string {
  const radioMatch = /^radio(\d+)$/.exec(deviceName);
  return radioMatch ? `phy${radioMatch[1]}` : "";
}

interface LiveWifiDevice {
  devName: string;
  info: IwinfoInfo;
  band: WifiBand;
  stationCount: number;
}

function matchesPhy(live: LiveWifiDevice, phy: string): boolean {
  if (!phy) {
    return false;
  }
  const livePhy = live.info.phy || "";
  return livePhy === phy || livePhy.startsWith(`${phy}-`) || live.devName === phy || live.devName.startsWith(`${phy}-`);
}

function findMatchingLiveWifi(
  iface: Record<string, unknown>,
  radio: Record<string, unknown> | undefined,
  deviceName: string,
  uciBand: WifiBand,
  liveDevices: LiveWifiDevice[],
  usedDevices: Set<string>,
): LiveWifiDevice | null {
  const available = liveDevices.filter((item) => !usedDevices.has(item.devName));
  if (available.length === 0) {
    return null;
  }

  const ifname = stringOrEmpty(iface.ifname);
  if (ifname) {
    const byIfname = available.find((item) => item.devName === ifname);
    if (byIfname) {
      return byIfname;
    }
  }

  const rawSsid = rawStringOrEmpty(iface.ssid);
  const explicitPhy = stringOrEmpty(radio?.phy);
  const guessedPhy = guessRadioPhy(deviceName);

  if (explicitPhy && rawSsid) {
    const byExplicitPhyAndSsid = available.find((item) => matchesPhy(item, explicitPhy) && item.info.ssid === rawSsid);
    if (byExplicitPhyAndSsid) {
      return byExplicitPhyAndSsid;
    }
  }

  if (rawSsid && uciBand !== "Unknown") {
    const byBandAndSsid = available.find((item) => item.band === uciBand && item.info.ssid === rawSsid);
    if (byBandAndSsid) {
      return byBandAndSsid;
    }
  }

  if (guessedPhy && rawSsid) {
    const byGuessedPhyAndSsid = available.find((item) => matchesPhy(item, guessedPhy) && item.info.ssid === rawSsid);
    if (byGuessedPhyAndSsid) {
      return byGuessedPhyAndSsid;
    }
  }

  if (rawSsid) {
    const bySsid = available.find((item) => item.info.ssid === rawSsid);
    if (bySsid) {
      return bySsid;
    }
  }

  if (explicitPhy) {
    const byExplicitPhy = available.find((item) => matchesPhy(item, explicitPhy));
    if (byExplicitPhy) {
      return byExplicitPhy;
    }
  }

  if (uciBand !== "Unknown") {
    const byBand = available.find((item) => item.band === uciBand);
    if (byBand) {
      return byBand;
    }
  }

  if (guessedPhy) {
    const byGuessedPhy = available.find((item) => matchesPhy(item, guessedPhy));
    if (byGuessedPhy) {
      return byGuessedPhy;
    }
  }

  return null;
}

function resolveWepPassphrase(values: Record<string, unknown>): string {
  const keyVal = values.key;
  if (typeof keyVal === "string" || typeof keyVal === "number") {
    const slot = String(keyVal).trim();
    if (/^[1-4]$/.test(slot)) {
      const slotVal = values[`key${slot}`];
      return typeof slotVal === "string" ? slotVal : "";
    }
    if (typeof keyVal === "string" && keyVal.length > 0) {
      return keyVal;
    }
  }
  return typeof values.key1 === "string" ? values.key1 : "";
}

/** Fetches UCI wireless interface configs merged with live `iwinfo` radio/association metrics (never exposing `key`). */
export async function fetchWifiConfigs(
  prefs: Partial<ExtensionPreferences> = {},
  signal?: AbortSignal,
): Promise<WifiInterfaceConfig[]> {
  const [uciRes, iwDevsRes] = await ubusBatch(
    [
      { object: "uci", method: "get", args: { config: "wireless" } },
      { object: "iwinfo", method: "devices" },
    ],
    prefs,
    signal,
  );

  if (!uciRes.ok) {
    throwBatchError(uciRes, "Failed to read wireless configuration");
  }

  const sections = getBatchValue<{ values?: UciSectionMap }>(uciRes)?.values ?? {};
  const radios = new Map<string, Record<string, unknown>>();
  const ifaces: Array<{ section: string; data: Record<string, unknown> }> = [];

  for (const [section, data] of Object.entries(sections)) {
    const type = data[".type"];
    if (type === "wifi-device") {
      radios.set(section, data);
    } else if (type === "wifi-iface") {
      ifaces.push({ section, data });
    }
  }

  const iwDeviceNames = getBatchValue<{ devices?: string[] }>(iwDevsRes)?.devices ?? [];
  const liveDevices: LiveWifiDevice[] = [];

  if (iwDeviceNames.length > 0) {
    const calls: UbusCallSpec[] = [];
    for (const device of iwDeviceNames) {
      calls.push({ object: "iwinfo", method: "info", args: { device } });
      calls.push({ object: "iwinfo", method: "assoclist", args: { device } });
    }
    const liveResults = await ubusBatch(calls, prefs, signal);
    for (let i = 0; i < iwDeviceNames.length; i += 1) {
      const devName = iwDeviceNames[i];
      const info = getBatchValue<IwinfoInfo>(liveResults[i * 2]) ?? {};
      const assoc = getBatchValue<{ results?: IwinfoAssocEntry[] }>(liveResults[i * 2 + 1]);
      const stationCount = Array.isArray(assoc?.results) ? assoc.results.length : 0;
      liveDevices.push({
        devName,
        info,
        band: formatFrequencyBand(info.frequency),
        stationCount,
      });
    }
  }

  const usedLiveDevices = new Set<string>();

  return ifaces.map(({ section, data }): WifiInterfaceConfig => {
    const device = stringOrEmpty(data.device);
    const radio = device ? radios.get(device) : undefined;
    const disabled = parseUciBool(data.disabled, false);
    const radioDisabled = parseUciBool(radio?.disabled, false);
    const uciChannel = parsePositiveInt(radio?.channel);
    const uciBand = resolveUciBand(radio, uciChannel);

    const live =
      !disabled && !radioDisabled
        ? findMatchingLiveWifi(data, radio, device, uciBand, liveDevices, usedLiveDevices)
        : null;
    if (live) {
      usedLiveDevices.add(live.devName);
    }

    const channel = typeof live?.info.channel === "number" ? live.info.channel : uciChannel;
    const band = live && live.band !== "Unknown" ? live.band : uciBand;
    const network = Array.isArray(data.network)
      ? data.network
          .filter((n): n is string => typeof n === "string")
          .map((n) => n.trim())
          .filter(Boolean)
          .join(", ")
      : stringOrEmpty(data.network);
    const encryption = stringOrEmpty(data.encryption) || "none";
    const hasKey = encryption.toLowerCase().startsWith("wep")
      ? resolveWepPassphrase(data).length > 0
      : typeof data.key === "string" && data.key.length > 0;

    return {
      section,
      device,
      ssid: rawStringOrEmpty(data.ssid),
      encryption,
      mode: stringOrEmpty(data.mode) || "ap",
      network,
      disabled,
      hidden: parseUciBool(data.hidden, false),
      hasKey,
      band,
      channel,
      htmode: live?.info.htmode || stringOrEmpty(radio?.htmode),
      radioDisabled,
      liveDevice: live?.devName ?? null,
      stationCount: live?.stationCount ?? 0,
      bitrateKbps: typeof live?.info.bitrate === "number" ? live.info.bitrate : null,
    };
  });
}

/** Fetches a Wi-Fi section passphrase on demand from UCI `wireless` without caching it. */
export async function fetchWifiPassphrase(
  section: string,
  prefs: Partial<ExtensionPreferences> = {},
  signal?: AbortSignal,
): Promise<string> {
  const safeSection = validateIdentifier(section, "wireless section");
  const secRes = await ubusCall<{ values?: Record<string, unknown> }>(
    "uci",
    "get",
    { config: "wireless", section: safeSection },
    prefs,
    signal,
  );
  const values = secRes.values ?? {};
  const enc = stringOrEmpty(values.encryption).toLowerCase();
  if (enc.startsWith("wep")) {
    return resolveWepPassphrase(values);
  }
  return typeof values.key === "string" ? values.key : "";
}

/** Enables or disables a UCI `wireless` section, commits, and reconfigures Wi-Fi. */
export async function setWifiSectionDisabled(
  section: string,
  disabled: boolean,
  prefs: Partial<ExtensionPreferences> = {},
  signal?: AbortSignal,
): Promise<void> {
  const safeSection = validateIdentifier(section, "wireless section");
  await verifyUciSection("wireless", safeSection, ["wifi-iface", "wifi-device"], undefined, prefs, signal);
  await ubusCall(
    "uci",
    "set",
    { config: "wireless", section: safeSection, values: { disabled: disabled ? "1" : "0" } },
    prefs,
    signal,
  );
  await commitAndReloadUci("wireless", prefs, async () => {
    await ubusCallOptional("network", "reload", {}, prefs, undefined);
    const reconf = await ubusCallOptional("network.wireless", "reconf", {}, prefs, undefined);
    if (reconf === null) {
      const execRes = await execRouterCommand("/sbin/wifi", ["reload"], prefs, undefined, 20_000);
      if (execRes.code !== 0) {
        throw new OpenWrtError(
          "RPC_ERROR",
          execRes.stderr?.trim() || `/sbin/wifi reload exited with code ${execRes.code}.`,
        );
      }
    }
  });
}

interface IwinfoScanRaw {
  bssid?: string;
  ssid?: string;
  channel?: number;
  mhz?: number;
  frequency?: number;
  signal?: number;
  quality?: number;
  quality_max?: number;
  width?: number;
  htmode?: string;
  ht_operation?: {
    channel_width?: number;
    secondary_channel_offset?: string | number;
  };
  vht_operation?: { channel_width?: number };
  he_operation?: { channel_width?: number };
  eht_operation?: { channel_width?: number };
  encryption?:
    | string
    | {
        enabled?: boolean;
        wep?: boolean;
        wpa?: number[];
        authentication?: string[];
        description?: string;
      };
}

function formatScanEncryption(rawEnc: IwinfoScanRaw["encryption"]): string {
  if (typeof rawEnc === "string") {
    return rawEnc.trim() || "Unknown";
  }
  if (!rawEnc || typeof rawEnc !== "object") {
    return "Unknown";
  }
  if (typeof rawEnc.description === "string" && rawEnc.description.trim()) {
    return rawEnc.description.trim();
  }
  if (rawEnc.enabled === false) {
    return "Open";
  }
  if (rawEnc.wep) {
    return "WEP";
  }

  const auths = Array.isArray(rawEnc.authentication)
    ? rawEnc.authentication.map((a) => String(a).trim().toLowerCase()).filter(Boolean)
    : [];
  const hasOwe = auths.includes("owe");
  const hasSae = auths.some((a) => a === "sae" || a.startsWith("sae-"));
  const hasPsk = auths.includes("psk");
  const hasEnterprise = auths.some((a) => a === "802.1x" || a.includes("eap"));

  if (hasOwe && !hasSae && !hasPsk && !hasEnterprise) {
    return "OWE";
  }

  const wpaSet = new Set(Array.isArray(rawEnc.wpa) ? rawEnc.wpa.filter((v) => typeof v === "number") : []);
  if (hasSae) {
    wpaSet.add(3);
    if (!hasPsk && !hasEnterprise) {
      wpaSet.delete(2);
    }
  }
  if (auths.some((a) => a.includes("suite-b") || a.includes("sha384"))) {
    wpaSet.add(3);
  }

  const wpaVersions = Array.from(wpaSet).sort((a, b) => a - b);
  const wpaLabel = wpaVersions
    .map((ver) => (ver === 1 ? "WPA" : ver === 2 ? "WPA2" : ver === 3 ? "WPA3" : `WPA${ver}`))
    .join("/");
  const authLabel = auths.map((a) => a.toUpperCase()).join("/");

  if (wpaLabel && authLabel) {
    return `${wpaLabel} ${authLabel}`;
  }
  if (wpaLabel) {
    return wpaLabel;
  }
  if (authLabel) {
    return authLabel;
  }
  return "Encrypted";
}

function parseHtOperationWidth(htOp: IwinfoScanRaw["ht_operation"]): number | null {
  const width = htOp?.channel_width;
  if (typeof width !== "number" || width <= 0) {
    return null;
  }
  if (width === 2040) {
    const offset = String(htOp?.secondary_channel_offset ?? "")
      .trim()
      .toLowerCase();
    return offset === "above" || offset === "below" || offset === "+1" || offset === "-1" ? 40 : 20;
  }
  return width;
}

function normalizeChannelWidth(width: number): number {
  return width === 8080 ? 160 : width;
}

function parseScanWidthMhz(raw: IwinfoScanRaw): number | null {
  if (typeof raw.width === "number" && raw.width > 0) {
    return normalizeChannelWidth(raw.width);
  }

  const ehtWidth = raw.eht_operation?.channel_width;
  if (typeof ehtWidth === "number" && ehtWidth > 0) {
    const normalized = normalizeChannelWidth(ehtWidth);
    if (normalized === 40) {
      return parseHtOperationWidth(raw.ht_operation) ?? 40;
    }
    return normalized;
  }

  const heWidth = raw.he_operation?.channel_width;
  if (typeof heWidth === "number" && heWidth > 0) {
    const normalized = normalizeChannelWidth(heWidth);
    if (normalized === 40) {
      return parseHtOperationWidth(raw.ht_operation) ?? 40;
    }
    return normalized;
  }

  const vhtWidth = raw.vht_operation?.channel_width;
  if (typeof vhtWidth === "number" && vhtWidth > 0) {
    const normalized = normalizeChannelWidth(vhtWidth);
    if (normalized === 40) {
      return parseHtOperationWidth(raw.ht_operation) ?? 40;
    }
    return normalized;
  }

  const htWidth = parseHtOperationWidth(raw.ht_operation);
  if (htWidth !== null) {
    return htWidth;
  }

  const trimmedHtmode = (raw.htmode ?? "").trim();
  if (/80\s*[+p]\s*80$/i.test(trimmedHtmode)) {
    return 160;
  }
  const htMatch = /(\d+)$/.exec(trimmedHtmode);
  if (htMatch) {
    const width = Number.parseInt(htMatch[1], 10);
    return width > 0 ? normalizeChannelWidth(width) : null;
  }
  return null;
}

/** Scans nearby Wi-Fi networks on a live wireless interface, sorted strongest signal first. */
export async function scanWifiChannels(
  device: string,
  prefs: Partial<ExtensionPreferences> = {},
  signal?: AbortSignal,
): Promise<WifiScanResult[]> {
  const safeDevice = validateIdentifier(device, "wireless device");
  const res = await ubusCall<{ results?: IwinfoScanRaw[] }>(
    "iwinfo",
    "scan",
    { device: safeDevice },
    prefs,
    signal,
    20_000,
  );
  const rawResults = Array.isArray(res.results) ? res.results : [];

  const mapped: WifiScanResult[] = rawResults.map((item) => {
    const mhz = typeof item.mhz === "number" ? item.mhz : typeof item.frequency === "number" ? item.frequency : null;
    const channel = typeof item.channel === "number" ? item.channel : null;
    let band: WifiBand = mhz !== null && mhz >= 5925 ? "6 GHz" : formatFrequencyBand(mhz);
    if (band === "Unknown") {
      band = resolveBandFromChannel(channel);
    }

    return {
      bssid: stringOrEmpty(item.bssid).toUpperCase(),
      ssid: typeof item.ssid === "string" ? item.ssid.replace(/\0/g, "") : "",
      band,
      channel,
      mhz,
      signal: typeof item.signal === "number" && item.signal < 0 ? item.signal : null,
      quality: typeof item.quality === "number" ? item.quality : null,
      qualityMax: typeof item.quality_max === "number" ? item.quality_max : null,
      widthMhz: parseScanWidthMhz(item),
      encryption: formatScanEncryption(item.encryption),
    };
  });

  return mapped.sort((a, b) => {
    const sigA = a.signal ?? -999;
    const sigB = b.signal ?? -999;
    if (sigB !== sigA) {
      return sigB - sigA;
    }
    return a.ssid.localeCompare(b.ssid) || a.bssid.localeCompare(b.bssid);
  });
}

function normalizeSyslogSeverity(raw: string): SyslogSeverity {
  const lower = raw.trim().toLowerCase();
  if (lower === "warning") {
    return "warn";
  }
  switch (lower) {
    case "emerg":
    case "alert":
    case "crit":
    case "err":
    case "warn":
    case "notice":
    case "info":
    case "debug":
      return lower;
    default:
      return "unknown";
  }
}

/** Reads recent router syslog entries via `/sbin/logread -l <lines>`, returned newest first. */
export async function fetchSystemLogs(
  lines = 200,
  prefs: Partial<ExtensionPreferences> = {},
  signal?: AbortSignal,
): Promise<SyslogEntry[]> {
  const clamped = Math.min(1000, Math.max(20, Math.floor(Number.isFinite(lines) ? lines : 200)));
  const res = await execRouterCommand("/sbin/logread", ["-l", String(clamped)], prefs, signal);
  if (res.code !== 0 && !res.stdout?.trim()) {
    throw new OpenWrtError("RPC_ERROR", res.stderr?.trim() || `logread exited with code ${res.code}.`);
  }

  const rawLines = (res.stdout ?? "").split(/\r?\n/);
  const entries: SyslogEntry[] = [];

  for (let idx = 0; idx < rawLines.length; idx += 1) {
    const rawLine = rawLines[idx].replace(/\r$/, "");
    if (!rawLine.trim()) {
      continue;
    }

    const headerMatch = SYSLOG_HEADER_PATTERN.exec(rawLine);
    if (headerMatch) {
      const timestamp = headerMatch[1].trim();
      const facility = headerMatch[2].trim().toLowerCase();
      const severity = normalizeSyslogSeverity(headerMatch[3]);
      const body = headerMatch[4];
      const daemonMatch = SYSLOG_DAEMON_PATTERN.exec(body);

      entries.push({
        id: `log-${idx}`,
        timestamp,
        facility,
        severity,
        daemon: daemonMatch ? daemonMatch[1].trim() : facility || "syslog",
        pid: daemonMatch?.[2] ? daemonMatch[2].trim() : null,
        message: daemonMatch ? daemonMatch[3].trim() : body.trim(),
        raw: rawLine,
      });
    } else if (entries.length > 0) {
      const prev = entries[entries.length - 1];
      const continuation = rawLine.trimEnd();
      prev.message = prev.message ? `${prev.message}\n${continuation}` : continuation;
      prev.raw = `${prev.raw}\n${continuation}`;
    } else {
      entries.push({
        id: `log-${idx}`,
        timestamp: "",
        facility: "unknown",
        severity: "unknown",
        daemon: "syslog",
        pid: null,
        message: rawLine.trim(),
        raw: rawLine,
      });
    }
  }

  return entries.reverse();
}

interface ConntrackRaw {
  layer3?: string;
  layer4?: string;
  src?: string;
  dst?: string;
  sport?: number | string;
  dport?: number | string;
  bytes?: number | string;
  packets?: number | string;
  timeout?: number | string;
}

function canonicalizeIpv6(raw: string): string {
  const trimmed = raw.trim();
  const zoneIdx = trimmed.indexOf("%");
  const addrPart = zoneIdx >= 0 ? trimmed.slice(0, zoneIdx) : trimmed;
  const zonePart = zoneIdx >= 0 ? trimmed.slice(zoneIdx) : "";
  if (isIP(addrPart) !== 6) {
    return trimmed;
  }

  const doubleColonParts = addrPart.split("::");
  if (doubleColonParts.length > 2) {
    return trimmed;
  }

  const parseSide = (side: string): number[] => {
    if (!side) {
      return [];
    }
    const tokens = side.split(":");
    const out: number[] = [];
    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i];
      if (i === tokens.length - 1 && token.includes(".")) {
        const octets = token.split(".").map((o) => Number.parseInt(o, 10));
        if (octets.length !== 4 || octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) {
          return [];
        }
        out.push((octets[0] << 8) | octets[1], (octets[2] << 8) | octets[3]);
      } else {
        out.push(Number.parseInt(token, 16));
      }
    }
    return out;
  };

  let hextets: number[];
  if (doubleColonParts.length === 2) {
    const left = parseSide(doubleColonParts[0]);
    const right = parseSide(doubleColonParts[1]);
    const fillCount = 8 - left.length - right.length;
    if (fillCount < 0) {
      return trimmed;
    }
    hextets = [...left, ...new Array<number>(fillCount).fill(0), ...right];
  } else {
    hextets = parseSide(addrPart);
  }

  if (hextets.length !== 8 || hextets.some((h) => !Number.isInteger(h) || h < 0 || h > 0xffff)) {
    return trimmed;
  }

  let bestStart = -1;
  let bestLen = 0;
  let curStart = -1;
  let curLen = 0;
  for (let i = 0; i < 8; i += 1) {
    if (hextets[i] === 0) {
      if (curStart === -1) {
        curStart = i;
        curLen = 1;
      } else {
        curLen += 1;
      }
      if (curLen > bestLen) {
        bestStart = curStart;
        bestLen = curLen;
      }
    } else {
      curStart = -1;
      curLen = 0;
    }
  }

  const hexGroups = hextets.map((h) => h.toString(16));
  const canonical =
    bestLen >= 2
      ? `${hexGroups.slice(0, bestStart).join(":")}::${hexGroups.slice(bestStart + bestLen).join(":")}`
      : hexGroups.join(":");

  return `${canonical}${zonePart}`;
}

function canonicalizeIp(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }
  const withoutZone = trimmed.split("%", 1)[0];
  return isIP(withoutZone) === 6 ? canonicalizeIpv6(trimmed) : trimmed;
}

function stripIpZone(ip: string): string {
  const idx = ip.indexOf("%");
  return idx >= 0 ? ip.slice(0, idx) : ip;
}

function inferLayer3(rawLayer3: unknown, src: string, dst: string, layer4: string): string {
  const explicit = stringOrEmpty(rawLayer3).toLowerCase();
  if (explicit === "ipv4" || explicit === "ip") {
    return "ipv4";
  }
  if (explicit === "ipv6" || explicit === "ip6") {
    return "ipv6";
  }

  const srcBase = stripIpZone(src);
  const dstBase = stripIpZone(dst);
  if (isIP(srcBase) === 6 || isIP(dstBase) === 6 || layer4.toLowerCase() === "icmpv6") {
    return "ipv6";
  }
  if (isIPv4(srcBase) || isIPv4(dstBase)) {
    return "ipv4";
  }
  return explicit || "unknown";
}

/** Fetches active NAT conntrack connections enriched with local client hostnames, sorted by bytes descending. */
export async function fetchActiveConnections(
  prefs: Partial<ExtensionPreferences> = {},
  signal?: AbortSignal,
): Promise<ConntrackEntry[]> {
  const [conntrackRes, clients] = await Promise.all([
    ubusCall<{ result?: ConntrackRaw[] } | ConntrackRaw[]>("luci", "getConntrackList", {}, prefs, signal),
    fetchClients(prefs, signal).catch((err) => {
      if (signal?.aborted || (err instanceof Error && err.name === "AbortError")) {
        throw err instanceof Error ? err : createAbortError(signal);
      }
      return [] as ClientRecord[];
    }),
  ]);

  if (signal?.aborted) {
    throw createAbortError(signal);
  }

  const hostByIp = new Map<string, string>();
  const registerHostIp = (rawIp: string | null | undefined, hostname: string) => {
    if (!rawIp) {
      return;
    }
    const normalized = canonicalizeIp(rawIp.replace(/\/\d+$/, ""));
    const lookupKey = stripIpZone(normalized);
    if (lookupKey && !hostByIp.has(lookupKey)) {
      hostByIp.set(lookupKey, hostname);
    }
  };

  for (const client of clients) {
    if (!client.hostname) {
      continue;
    }
    registerHostIp(client.ip, client.hostname);
    for (const ip of client.allIps) {
      registerHostIp(ip, client.hostname);
    }
    for (const ip of client.ipv6) {
      registerHostIp(ip, client.hostname);
    }
  }

  const rawList = Array.isArray(conntrackRes)
    ? conntrackRes
    : Array.isArray(conntrackRes?.result)
      ? conntrackRes.result
      : [];

  const entries: ConntrackEntry[] = rawList.map((raw, idx) => {
    const layer4 = stringOrEmpty(raw.layer4) || "unknown";
    const src = canonicalizeIp(stringOrEmpty(raw.src));
    const dst = canonicalizeIp(stringOrEmpty(raw.dst));
    const layer3 = inferLayer3(raw.layer3, src, dst, layer4);
    const sport = parseOptionalPort(raw.sport);
    const dport = parseOptionalPort(raw.dport);
    const srcKey = stripIpZone(src);
    const dstKey = stripIpZone(dst);

    return {
      id: `${idx}-${layer4}-${src}-${sport ?? ""}-${dst}-${dport ?? ""}`,
      layer3,
      layer4,
      src,
      dst,
      sport,
      dport,
      bytes: parseNumber(raw.bytes, 0),
      packets: parseNumber(raw.packets, 0),
      timeout: parseNumber(raw.timeout, 0),
      srcHost: (srcKey ? hostByIp.get(srcKey) : undefined) ?? null,
      dstHost: (dstKey ? hostByIp.get(dstKey) : undefined) ?? null,
    };
  });

  return entries.sort((a, b) => b.bytes - a.bytes || b.packets - a.packets);
}

interface ProcessRaw {
  PID?: number | string;
  PPID?: number | string;
  USER?: string;
  STAT?: string;
  VSZ?: number | string;
  "%MEM"?: number | string;
  "%VSZ"?: number | string;
  "%CPU"?: number | string;
  MEM?: number | string;
  CPU?: number | string;
  COMMAND?: string;
  pid?: number | string;
  ppid?: number | string;
  user?: string;
  stat?: string;
  vsz?: number | string;
  command?: string;
}

function parseVszToBytes(rawVsz: string): number {
  const match = /^(\d+(?:\.\d+)?)\s*(t(?:i?b)?|g(?:i?b)?|m(?:i?b)?|k(?:i?b)?|b)?$/i.exec(rawVsz.trim());
  if (!match) {
    return 0;
  }
  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  const suffix = (match[2] ?? "k").toLowerCase();
  if (suffix.startsWith("t")) {
    return Math.round(value * 1024 * 1024 * 1024 * 1024);
  }
  if (suffix.startsWith("g")) {
    return Math.round(value * 1024 * 1024 * 1024);
  }
  if (suffix.startsWith("m")) {
    return Math.round(value * 1024 * 1024);
  }
  if (suffix === "b") {
    return Math.round(value);
  }
  return Math.round(value * 1024);
}

function parsePercentValue(raw: unknown): number {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : 0;
  }
  if (typeof raw === "string") {
    const cleaned = raw.replace(/%/g, "").trim();
    if (!cleaned) {
      return 0;
    }
    const num = Number.parseFloat(cleaned);
    return Number.isFinite(num) ? num : 0;
  }
  return 0;
}

function firstDefinedValue(...candidates: Array<number | string | undefined>): number | string | undefined {
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && String(candidate).trim() !== "") {
      return candidate;
    }
  }
  return undefined;
}

/** Fetches the router process table via `luci.getProcessList`, sorted by CPU% then MEM% descending. */
export async function fetchProcessList(
  prefs: Partial<ExtensionPreferences> = {},
  signal?: AbortSignal,
): Promise<RouterProcessEntry[]> {
  const res = await ubusCall<{ result?: ProcessRaw[] } | ProcessRaw[]>("luci", "getProcessList", {}, prefs, signal);
  const rawList = Array.isArray(res) ? res : Array.isArray(res?.result) ? res.result : [];

  const entries: RouterProcessEntry[] = [];
  for (const raw of rawList) {
    const pid = parsePositiveInt(raw.PID ?? raw.pid);
    if (pid === null || pid < 1 || pid > MAX_LINUX_PID) {
      continue;
    }
    const ppid = Math.trunc(parseNumber(raw.PPID ?? raw.ppid, 0));
    const vszRaw = String(raw.VSZ ?? raw.vsz ?? "0").trim();
    const command = stringOrEmpty(raw.COMMAND ?? raw.command);

    entries.push({
      pid,
      ppid: Number.isInteger(ppid) && ppid >= 0 && ppid <= MAX_LINUX_PID ? ppid : 0,
      user: stringOrEmpty(raw.USER ?? raw.user) || "unknown",
      stat: stringOrEmpty(raw.STAT ?? raw.stat),
      vsz: vszRaw,
      vszBytes: parseVszToBytes(vszRaw),
      memPercent: parsePercentValue(firstDefinedValue(raw["%MEM"], raw.MEM, raw["%VSZ"])),
      cpuPercent: parsePercentValue(firstDefinedValue(raw["%CPU"], raw.CPU)),
      command,
    });
  }

  return entries.sort((a, b) => b.cpuPercent - a.cpuPercent || b.memPercent - a.memPercent || b.vszBytes - a.vszBytes);
}

/** Sends SIGTERM or SIGKILL to a router process PID (2..4194304) via `/bin/kill`. */
export async function signalRouterProcess(
  pid: number,
  sig: "TERM" | "KILL",
  prefs: Partial<ExtensionPreferences> = {},
  signal?: AbortSignal,
): Promise<void> {
  if (!Number.isInteger(pid) || pid <= 1 || pid > MAX_LINUX_PID) {
    throw new OpenWrtError(
      "RPC_ERROR",
      `Invalid target PID "${pid}". PID must be an integer between 2 and ${MAX_LINUX_PID}.`,
    );
  }
  if (sig !== "TERM" && sig !== "KILL") {
    throw new OpenWrtError("RPC_ERROR", `Unsupported signal "${String(sig)}".`);
  }

  const execRes = await execRouterCommand("/bin/kill", [sig === "KILL" ? "-9" : "-15", String(pid)], prefs, signal);
  if (execRes.code !== 0) {
    throw new OpenWrtError("RPC_ERROR", execRes.stderr?.trim() || `/bin/kill exited with code ${execRes.code}.`);
  }
}

interface UpnpRuleRaw {
  num?: number | string;
  proto?: string;
  extport?: number | string;
  intaddr?: string;
  intport?: number | string;
  descr?: string;
  expires?: number | string;
  host_hint?: string;
}

/** Fetches UCI firewall `redirect` rules and optional `luci.upnp` active port mappings. */
export async function fetchFirewallAndUpnp(
  prefs: Partial<ExtensionPreferences> = {},
  signal?: AbortSignal,
): Promise<FirewallUpnpSnapshot> {
  const [fwRes, upnpRes] = await ubusBatch(
    [
      { object: "uci", method: "get", args: { config: "firewall" } },
      { object: "luci.upnp", method: "get_status" },
    ],
    prefs,
    signal,
  );

  if (!fwRes.ok) {
    throwBatchError(fwRes, "Failed to read firewall configuration");
  }

  const sections = getBatchValue<{ values?: UciSectionMap }>(fwRes)?.values ?? {};
  const redirects: FirewallRedirect[] = [];

  for (const [section, data] of Object.entries(sections)) {
    if (data[".type"] !== "redirect") {
      continue;
    }
    const proto = Array.isArray(data.proto)
      ? data.proto
          .filter((p): p is string => typeof p === "string")
          .map((p) => p.trim())
          .filter(Boolean)
          .join(" ")
      : stringOrEmpty(data.proto);

    redirects.push({
      section,
      name: stringOrEmpty(data.name),
      enabled: parseUciBool(data.enabled, true),
      src: stringOrEmpty(data.src),
      dest: stringOrEmpty(data.dest),
      proto,
      srcDport: stringOrEmpty(data.src_dport),
      destIp: stringOrEmpty(data.dest_ip),
      destPort: stringOrEmpty(data.dest_port),
      target: stringOrEmpty(data.target) || "DNAT",
    });
  }

  let upnpAvailable = false;
  let upnpRules: UpnpRule[] = [];
  let upnpError: string | null = null;

  if (upnpRes.ok) {
    const upnpPayload = getBatchValue<{ rules?: UpnpRuleRaw[]; result?: unknown; error?: unknown }>(upnpRes);
    if (typeof upnpPayload?.error === "string" && upnpPayload.error.trim()) {
      upnpError = upnpPayload.error.trim();
    } else if (
      typeof upnpPayload?.result === "string" &&
      upnpPayload.result.trim() &&
      !Array.isArray(upnpPayload.rules)
    ) {
      upnpError = upnpPayload.result.trim();
    } else {
      upnpAvailable = true;
      const rawRules = Array.isArray(upnpPayload?.rules) ? upnpPayload.rules : [];
      upnpRules = rawRules.map((rule) => {
        const rawNum = rule.num === undefined || rule.num === null ? "" : String(rule.num).trim();
        const num = UPNP_TOKEN_PATTERN.test(rawNum) ? rawNum : "";
        return {
          num,
          proto: stringOrEmpty(rule.proto),
          extport: Math.trunc(parseNumber(rule.extport, 0)),
          intaddr: stringOrEmpty(rule.intaddr),
          intport: Math.trunc(parseNumber(rule.intport, 0)),
          descr: stringOrEmpty(rule.descr),
          expires: Math.trunc(parseNumber(rule.expires, 0)),
          hostHint: typeof rule.host_hint === "string" && rule.host_hint.trim() ? rule.host_hint.trim() : null,
        };
      });
    }
  } else if (upnpRes.statusCode !== 3 && upnpRes.statusCode !== 4) {
    upnpError = upnpRes.message || `UPnP status failed (ubus code ${upnpRes.statusCode}).`;
  }

  return {
    redirects,
    upnpRules,
    upnpAvailable,
    upnpError,
  };
}

/** Enables or disables a UCI firewall `redirect` rule, commits, and reloads firewall. */
export async function toggleFirewallRedirect(
  section: string,
  enabled: boolean,
  prefs: Partial<ExtensionPreferences> = {},
  signal?: AbortSignal,
  expected?: { name?: string },
): Promise<void> {
  const safeSection = validateIdentifier(section, "firewall section");
  await verifyUciSection("firewall", safeSection, "redirect", expected, prefs, signal);
  await ubusCall(
    "uci",
    "set",
    { config: "firewall", section: safeSection, values: { enabled: enabled ? "1" : "0" } },
    prefs,
    signal,
  );
  await commitAndReloadUci("firewall", prefs, () => runServiceAction("firewall", "reload", prefs, undefined));
}

/** Adds a UCI firewall DNAT port forward (`redirect` section), commits, and reloads firewall. */
export async function addFirewallRedirect(
  input: { name: string; srcDport: string; destIp: string; destPort: string; proto?: string },
  prefs: Partial<ExtensionPreferences> = {},
  signal?: AbortSignal,
): Promise<void> {
  if (/[\r\n\0]/.test(input.name)) {
    throw new OpenWrtError("RPC_ERROR", "Firewall rule name contains invalid control characters.");
  }
  const name = input.name.trim();
  if (!name || name.length > 128) {
    throw new OpenWrtError("RPC_ERROR", "Firewall rule name must be non-empty and at most 128 characters.");
  }

  const proto = (input.proto ?? "tcp udp").trim().toLowerCase();
  if (!ALLOWED_FIREWALL_PROTOS.has(proto)) {
    throw new OpenWrtError("RPC_ERROR", `Invalid protocol "${input.proto}". Allowed values: tcp, udp, tcp udp, all.`);
  }
  const hasPorts = Boolean(input.srcDport.trim() || input.destPort.trim());
  if (hasPorts && !PORT_CAPABLE_PROTOS.has(proto)) {
    throw new OpenWrtError(
      "RPC_ERROR",
      `Protocol "${proto}" does not support port forwarding. Choose tcp, udp, or tcp udp.`,
    );
  }

  const srcParsed = validatePortSpec(input.srcDport, "external port");
  const destParsed = validatePortSpec(input.destPort, "internal port");
  if (
    srcParsed.isRange &&
    destParsed.isRange &&
    srcParsed.end - srcParsed.start !== destParsed.end - destParsed.start
  ) {
    throw new OpenWrtError(
      "RPC_ERROR",
      `External port range (${srcParsed.text}) and internal port range (${destParsed.text}) must have the same width.`,
    );
  }

  const destIp = input.destIp.trim();
  if (!isIPv4(destIp)) {
    throw new OpenWrtError("RPC_ERROR", `Invalid internal IPv4 address "${input.destIp}".`);
  }

  await ubusCall(
    "uci",
    "add",
    {
      config: "firewall",
      type: "redirect",
      values: {
        name,
        target: "DNAT",
        src: "wan",
        dest: "lan",
        proto,
        src_dport: srcParsed.text,
        dest_ip: destIp,
        dest_port: destParsed.text,
        enabled: "1",
      },
    },
    prefs,
    signal,
  );
  await commitAndReloadUci("firewall", prefs, () => runServiceAction("firewall", "reload", prefs, undefined));
}

/** Deletes a UCI firewall `redirect` rule, commits, and reloads firewall. */
export async function deleteFirewallRedirect(
  section: string,
  prefs: Partial<ExtensionPreferences> = {},
  signal?: AbortSignal,
  expected?: { name?: string },
): Promise<void> {
  const safeSection = validateIdentifier(section, "firewall section");
  await verifyUciSection("firewall", safeSection, "redirect", expected, prefs, signal);
  await ubusCall("uci", "delete", { config: "firewall", section: safeSection }, prefs, signal);
  await commitAndReloadUci("firewall", prefs, () => runServiceAction("firewall", "reload", prefs, undefined));
}

/** Removes an active UPnP / NAT-PMP lease via `luci.upnp.delete_rule`. */
export async function deleteUpnpRule(
  token: string,
  prefs: Partial<ExtensionPreferences> = {},
  signal?: AbortSignal,
): Promise<void> {
  const trimmedToken = typeof token === "string" ? token.trim() : "";
  if (!UPNP_TOKEN_PATTERN.test(trimmedToken)) {
    throw new OpenWrtError("RPC_ERROR", `Invalid UPnP rule token "${token}". Expected a positive integer.`);
  }
  const res = await ubusCall<{ result?: unknown; error?: unknown }>(
    "luci.upnp",
    "delete_rule",
    { token: trimmedToken },
    prefs,
    signal,
  );
  if (typeof res?.error === "string" && res.error.trim()) {
    throw new OpenWrtError("RPC_ERROR", `UPnP delete_rule failed: ${res.error.trim()}.`);
  }
  if (typeof res?.result === "string") {
    const resultText = res.result.trim();
    if (resultText && !/^(ok|success|deleted|true)$/i.test(resultText)) {
      throw new OpenWrtError("RPC_ERROR", `UPnP delete_rule failed: ${resultText}.`);
    }
  } else if (res?.result === false) {
    throw new OpenWrtError("RPC_ERROR", "UPnP delete_rule failed.");
  }
}
