import { execFile, execFileSync } from "node:child_process";
import { networkInterfaces, hostname as osHostname } from "node:os";
import { vendorForMac } from "./oui";

/**
 * This Mac's Wi-Fi + identity info, harvested from no-sudo system sources.
 *
 * Sources (run in parallel):
 *   - `ipconfig getsummary <iface>` → BSSID, SSID, Security, IP, router,
 *     MAC. Instant.
 *   - `system_profiler SPAirPortDataType` → Channel, Country Code, PHY Mode,
 *     RSSI (Signal), Noise, Transmit Rate, + neighbor networks. ~1-2s.
 *   - `route -n get default` → router IP (cross-check with DHCP).
 *   - `networksetup -listallhardwareports` → maps "Wi-Fi" → enX.
 *   - `scutil --dns` → primary DNS resolvers.
 *   - `scutil --get LocalHostName` → this Mac's Bonjour hostname.
 *   - `curl https://api.ipify.org` + `https://ipinfo.io/<ip>/json` → public
 *     IP + geolocation (best-effort; hides itself if offline).
 *
 * If the Mac is not on Wi-Fi, `getWiFiInfo` returns identity-only (no RF).
 */

export interface PublicIPInfo {
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  org?: string;
}

export interface WiFiNeighbor {
  ssid: string;
  rssi: string;
  channel?: string;
}

export interface WiFiInfo {
  ip: string;
  routerIp: string;
  routerVendor?: string;
  mac: string;
  hostname: string;
  dnsServers: string[];
  publicIp?: PublicIPInfo;
  neighbors?: WiFiNeighbor[];
  ssid?: string;
  bssid?: string;
  /** True when `ipconfig getsummary` returned `<redacted>` — needs Location. */
  bssidRedacted?: boolean;
  security?: string;
  channel?: string;
  countryCode?: string;
  phyMode?: string;
  rssi?: string;
  noise?: string;
  txRate?: string;
}

function run(cmd: string, args: string[], timeoutMs = 4000): Promise<string> {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: timeoutMs }, (_err, stdout) => {
      resolve(stdout ?? "");
    });
  });
}

/** Find the Wi-Fi interface name (en0/en1/...) via `networksetup`. */
async function findWiFiInterface(): Promise<string | undefined> {
  const out = await run("/usr/sbin/networksetup", ["-listallhardwareports"]);
  const lines = out.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("Wi-Fi")) {
      const m = lines[i + 1]?.match(/Device:\s*(\S+)/);
      if (m) return m[1];
    }
  }
  return undefined;
}

/** Find the default-route interface via `route -n get default`. */
function defaultRouteInterface(): string | undefined {
  try {
    const out = execFileSync("/sbin/route", ["-n", "get", "default"], {
      encoding: "utf8",
    });
    const m = out.match(/interface:\s*(\S+)/);
    return m?.[1];
  } catch {
    return undefined;
  }
}

/** Parse `ipconfig getsummary enX` for BSSID/SSID/Security/IP/MAC/router. */
function parseIpconfigSummary(out: string): Partial<WiFiInfo> {
  const info: Partial<WiFiInfo> = {};
  const bssid = out.match(/BSSID\s*:\s*([0-9a-f:]{17}|<redacted>)/i);
  if (bssid) {
    if (bssid[1].toLowerCase() === "<redacted>") {
      info.bssidRedacted = true;
    } else {
      info.bssid = bssid[1].toLowerCase();
    }
  }
  const ssid = out.match(/SSID\s*:\s*(\S+)/);
  if (ssid && ssid[1].toLowerCase() !== "<redacted>") info.ssid = ssid[1];
  const sec = out.match(/Security\s*:\s*(\S+)/);
  if (sec) info.security = sec[1].replace(/_/g, " ");
  const ip = out.match(/Addresses\s*:\s*\n\s*\d+\s*:\s*(\d+\.\d+\.\d+\.\d+)/);
  if (ip) info.ip = ip[1];
  const router = out.match(/siaddr\s*=\s*(\d+\.\d+\.\d+\.\d+)/);
  if (router) info.routerIp = router[1];
  const mac = out.match(/chaddr\s*=\s*([0-9a-f:]{17})/i);
  if (mac) info.mac = mac[1].toLowerCase();
  return info;
}

/** Parse `system_profiler SPAirPortDataType` for RF fields + SSID + neighbors. */
function parseAirPort(out: string): {
  info: Partial<WiFiInfo>;
  neighbors: WiFiNeighbor[];
} {
  const info: Partial<WiFiInfo> = {};
  const neighbors: WiFiNeighbor[] = [];
  // The "Current Network Information:" block holds the connected-network RF.
  const cur = out.split("Current Network Information:")[1];
  if (!cur) return { info, neighbors };
  const block = cur.split("Other Local Wi-Fi Networks:")[0] ?? cur;
  // SSID is the first non-empty line after "Current Network Information:",
  // before the field list (PHY Mode, Channel, etc.).
  const ssidMatch = block.match(/^\s*([^\n][\w\- ]+):/m);
  if (ssidMatch) info.ssid = ssidMatch[1].trim();
  const phy = block.match(/PHY Mode:\s*(.+)/);
  if (phy) info.phyMode = phy[1].trim();
  const chan = block.match(/Channel:\s*(.+)/);
  if (chan) info.channel = chan[1].trim();
  const cc = block.match(/Country Code:\s*(.+)/);
  if (cc) info.countryCode = cc[1].trim();
  const sig = block.match(
    /Signal\s*\/\s*Noise:\s*(-?\d+)\s*dBm\s*\/\s*(-?\d+)\s*dBm/,
  );
  if (sig) {
    info.rssi = `${sig[1]} dBm`;
    info.noise = `${sig[2]} dBm`;
  }
  const tx = block.match(/Transmit Rate:\s*(.+)/);
  if (tx) info.txRate = tx[1].trim();

  // Other Local Wi-Fi Networks: block — each network is a "SSID:" header line
  // followed by PHY/Channel/Signal/Noise fields. Parse the header + the
  // following field block until the next header or end.
  const neighborBlock = out.split("Other Local Wi-Fi Networks:")[1];
  if (neighborBlock) {
    // Split on lines that look like "      SSID:" (indented, colon-terminated
    // header) — but only those followed by PHY/Channel fields. A simple
    // heuristic: each network block starts at a line with an SSID followed by
    // a colon and is followed (within a few lines) by "Channel:".
    const lines = neighborBlock.split("\n");
    let curNeighbor: Partial<WiFiNeighbor> | null = null;
    for (const line of lines) {
      const header = line.match(/^\s{8,}(.+):\s*$/);
      if (
        header &&
        !/PHY Mode|Channel|Signal|Noise|Country Code|Security/.test(header[1])
      ) {
        // Potential SSID header. Flush previous if it had a channel.
        if (curNeighbor && curNeighbor.ssid && curNeighbor.channel) {
          neighbors.push(curNeighbor as WiFiNeighbor);
        }
        curNeighbor = { ssid: header[1].trim() };
      } else if (curNeighbor) {
        const cm = line.match(/Channel:\s*(.+)/);
        if (cm) curNeighbor.channel = cm[1].trim();
        const sm = line.match(/Signal\s*\/\s*Noise:\s*(-?\d+)\s*dBm/);
        if (sm) curNeighbor.rssi = `${sm[1]} dBm`;
      }
    }
    if (curNeighbor && curNeighbor.ssid && curNeighbor.channel) {
      neighbors.push(curNeighbor as WiFiNeighbor);
    }
  }
  return { info, neighbors };
}

/** Get the MAC of the default-route interface from os.networkInterfaces(). */
function macForInterface(iface: string): string | undefined {
  const ifaces = networkInterfaces();
  const addrs = ifaces[iface];
  if (!addrs) return undefined;
  const v4 = addrs.find((a) => a.family === "IPv4" && !a.internal);
  return v4?.mac;
}

/** Primary DNS resolvers from `scutil --dns` (nameserver[] lines). */
async function getDNSServers(): Promise<string[]> {
  try {
    const out = await run("/usr/sbin/scutil", ["--dns"], 4000);
    const ns = new Set<string>();
    for (const line of out.split("\n")) {
      const m = line.match(/nameserver\[0\]\s*:\s*([\d.]+)/);
      if (m) ns.add(m[1]);
    }
    return [...ns];
  } catch {
    return [];
  }
}

/** This Mac's Bonjour hostname (`scutil --get LocalHostName`). */
function localHostname(): string {
  try {
    return execFileSync("/usr/sbin/scutil", ["--get", "LocalHostName"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return osHostname();
  }
}

/**
 * Best-effort public IP + geolocation. Resolves undefined if offline. The
 * geolocation is only fetched when `allowGeolocation` is true (the user's
 * "Show public IP & location" preference) — otherwise only the raw IP,
 * which this Mac already reveals by sending any request, is returned.
 */
async function getPublicIP(
  allowGeolocation: boolean,
): Promise<PublicIPInfo | undefined> {
  try {
    const ip = await run(
      "/usr/bin/curl",
      ["-s", "--max-time", "4", "https://api.ipify.org"],
      6000,
    );
    const trimmed = ip.trim();
    if (!/^\d+\.\d+\.\d+\.\d+$/.test(trimmed)) return undefined;
    const info: PublicIPInfo = { ip: trimmed };
    if (!allowGeolocation) return info;
    try {
      const geo = await run(
        "/usr/bin/curl",
        ["-s", "--max-time", "4", `https://ipinfo.io/${trimmed}/json`],
        6000,
      );
      const city = geo.match(/"city":\s*"([^"]+)"/);
      const region = geo.match(/"region":\s*"([^"]+)"/);
      const country = geo.match(/"country":\s*"([^"]+)"/);
      const org = geo.match(/"org":\s*"([^"]+)"/);
      if (city) info.city = city[1];
      if (region) info.region = region[1];
      if (country) info.country = country[1];
      if (org) info.org = org[1];
    } catch {
      /* geo optional */
    }
    return info;
  } catch {
    return undefined;
  }
}

/** Router vendor via OUI lookup of the gateway MAC (from `arp -n <ip>`). */
function routerVendor(routerIp: string): string | undefined {
  if (!routerIp) return undefined;
  try {
    const out = execFileSync("/usr/sbin/arp", ["-n", routerIp], {
      encoding: "utf8",
    });
    // macOS `arp` prints MACs with un-padded octets (d4:d:ab:9:44:c0); the OUI
    // registry is keyed by padded hex (D40DAB). Normalize before lookup.
    const m = out.match(/at\s+([0-9a-f:]+)\s+on/i);
    if (!m) return undefined;
    const normalized = m[1]
      .split(":")
      .map((o) => o.padStart(2, "0"))
      .join(":")
      .toLowerCase();
    return vendorForMac(normalized);
  } catch {
    return undefined;
  }
}

/**
 * Harvest this Mac's network identity + Wi-Fi RF state. Returns `undefined`
 * if not on Wi-Fi (caller falls back to identity-only).
 */
/**
 * Wave 1: instant identity (IP, router, vendor, MAC, hostname, DNS).
 * All sources are <50ms. Returns the fast fields so the UI can render
 * immediately while Wi-Fi/neighbors/public-IP fetch in wave 2.
 */
export async function getIdentity(): Promise<Partial<WiFiInfo>> {
  const wifiIface = await findWiFiInterface();
  const routeIface = defaultRouteInterface();
  const iface = wifiIface ?? routeIface;
  if (!iface) return {};

  const [summary, dns] = await Promise.all([
    wifiIface
      ? run("/usr/sbin/ipconfig", ["getsummary", wifiIface])
      : Promise.resolve(""),
    getDNSServers(),
  ]);
  const fromSummary = parseIpconfigSummary(summary);

  let routerIp = fromSummary.routerIp;
  if (!routerIp) {
    try {
      const out = execFileSync("/sbin/route", ["-n", "get", "default"], {
        encoding: "utf8",
      });
      const m = out.match(/gateway:\s*(\d+\.\d+\.\d+\.\d+)/);
      if (m) routerIp = m[1];
    } catch {
      /* noop */
    }
  }

  const ip = fromSummary.ip ?? primaryIPv4(iface);
  const mac = fromSummary.mac ?? macForInterface(iface);
  const hostname = localHostname();
  const rVendor = routerVendor(routerIp ?? "");

  return {
    ip: ip ?? "",
    routerIp: routerIp ?? "",
    routerVendor: rVendor,
    mac: mac ?? "",
    hostname,
    dnsServers: dns,
  };
}

/**
 * Wave 2: Wi-Fi RF + neighbors + public IP/location. Slow (~4s for
 * system_profiler; ~1s for the curls). Merges onto a base identity object.
 * If not on Wi-Fi, the RF fields are absent and neighbors is undefined.
 */
export async function getWiFi(
  base: Partial<WiFiInfo>,
  allowGeolocation = true,
): Promise<Partial<WiFiInfo>> {
  const wifiIface = await findWiFiInterface();
  const routeIface = defaultRouteInterface();
  const iface = wifiIface ?? routeIface;
  if (!iface) return base;

  const [summary, profile, pub] = await Promise.all([
    wifiIface
      ? run("/usr/sbin/ipconfig", ["getsummary", wifiIface])
      : Promise.resolve(""),
    run("/usr/sbin/system_profiler", ["SPAirPortDataType"], 6000),
    getPublicIP(allowGeolocation),
  ]);
  const fromSummary = parseIpconfigSummary(summary);
  const { info: fromProfile, neighbors } = parseAirPort(profile);

  // SSID from `ipconfig getsummary` is `<redacted>` under macOS privacy
  // restrictions; `system_profiler` runs with system privileges and returns
  // the real SSID, so prefer it.
  const ssid = fromProfile.ssid ?? fromSummary.ssid;

  // If we have no SSID and no BSSID, we're not on Wi-Fi.
  if (!ssid && !fromSummary.bssid) {
    return { ...base, publicIp: pub };
  }

  return {
    ...base,
    publicIp: pub,
    ssid,
    bssid: fromSummary.bssid,
    bssidRedacted: fromSummary.bssidRedacted,
    security: fromSummary.security,
    channel: fromProfile.channel,
    countryCode: fromProfile.countryCode,
    phyMode: fromProfile.phyMode,
    rssi: fromProfile.rssi,
    noise: fromProfile.noise,
    txRate: fromProfile.txRate,
    neighbors,
  };
}

export async function getWiFiInfo(
  allowGeolocation = true,
): Promise<WiFiInfo | undefined> {
  const wifiIface = await findWiFiInterface();
  const routeIface = defaultRouteInterface();
  const iface = wifiIface ?? routeIface;
  if (!iface) return undefined;

  const [summary, profile, dns, pub] = await Promise.all([
    wifiIface
      ? run("/usr/sbin/ipconfig", ["getsummary", wifiIface])
      : Promise.resolve(""),
    run("/usr/sbin/system_profiler", ["SPAirPortDataType"], 6000),
    getDNSServers(),
    getPublicIP(allowGeolocation),
  ]);

  const fromSummary = parseIpconfigSummary(summary);
  const { info: fromProfile, neighbors } = parseAirPort(profile);

  // SSID from `ipconfig getsummary` is `<redacted>` under macOS privacy
  // restrictions (CoreLocation-gated since Catalina). `system_profiler` runs
  // with system privileges and returns the real SSID, so prefer it.
  const ssid = fromProfile.ssid ?? fromSummary.ssid;

  // Cross-check router via `route` if DHCP didn't give it.
  let routerIp = fromSummary.routerIp;
  if (!routerIp) {
    try {
      const out = execFileSync("/sbin/route", ["-n", "get", "default"], {
        encoding: "utf8",
      });
      const m = out.match(/gateway:\s*(\d+\.\d+\.\d+\.\d+)/);
      if (m) routerIp = m[1];
    } catch {
      /* noop */
    }
  }

  const ip = fromSummary.ip ?? primaryIPv4(iface);
  const mac = fromSummary.mac ?? macForInterface(iface);
  const hostname = localHostname();
  const rVendor = routerVendor(routerIp ?? "");

  // If we have no SSID and no BSSID, we're not on Wi-Fi.
  if (!ssid && !fromSummary.bssid) {
    return {
      ip: ip ?? "",
      routerIp: routerIp ?? "",
      routerVendor: rVendor,
      mac: mac ?? "",
      hostname,
      dnsServers: dns,
      publicIp: pub,
      neighbors,
    };
  }

  return {
    ip: ip ?? "",
    routerIp: routerIp ?? "",
    routerVendor: rVendor,
    mac: mac ?? "",
    hostname,
    dnsServers: dns,
    publicIp: pub,
    neighbors,
    ssid,
    bssid: fromSummary.bssid,
    bssidRedacted: fromSummary.bssidRedacted,
    security: fromSummary.security,
    channel: fromProfile.channel,
    countryCode: fromProfile.countryCode,
    phyMode: fromProfile.phyMode,
    rssi: fromProfile.rssi,
    noise: fromProfile.noise,
    txRate: fromProfile.txRate,
  };
}

function primaryIPv4(iface: string): string | undefined {
  const ifaces = networkInterfaces();
  const addrs = ifaces[iface];
  if (!addrs) return undefined;
  const v4 = addrs.find((a) => a.family === "IPv4" && !a.internal);
  return v4?.address;
}
