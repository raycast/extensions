import { spawn } from "node:child_process";

import type { MDNSService } from "./types";

/**
 * mDNS service enumeration via the system `dns-sd` binary.
 *
 * `bonjour-service` (multicast-dns) was verified to return 0 results on this
 * network; system Bonjour works (verified: types, instances, host→IP, TXT).
 * The extension's Node runtime inherits Local Network consent from the
 * signed Raycast.app, so `dns-sd` subprocesses work just like `arp` does.
 *
 * Pipeline per refresh:
 *   1. `dns-sd -B _services._dns-sd._udp local.`  → advertised service types
 *   2. `dns-sd -B <type> local.`                  → instances per type
 *   3. `dns-sd -L <instance> <type> local.`       → hostname + port + TXT
 *   4. `dns-sd -G v4 <hostname>.`                 → hostname → IPv4
 * Returns per-IP: friendly name, the set of advertised services (with port,
 * TXT-derived model/manufacturer/category), and the first type for compat.
 */

const D = "/usr/bin/dns-sd";
const CURATED_TYPES = [
  "_http._tcp",
  "_https._tcp",
  "_ssh._tcp",
  "_smb._tcp",
  "_airplay._tcp",
  "_raop._tcp",
  "_googlecast._tcp",
  "_device-info._tcp",
  "_plexmediasvr._tcp",
  "_workstation._tcp",
  "_ipp._tcp",
  "_ipps._tcp",
  "_afpovertcp._tcp",
  "_sonos._tcp",
  "_hap._tcp",
  "_matter._tcp",
  "_spotify-connect._tcp",
  "_yandexio._tcp",
  "_apple-mobdev2._tcp",
  "_companion-link._tcp",
];
const MAX_TYPES = 25;
const MAX_INSTANCES = 80;
const PER_PROCESS_MS = 3500;

function runDNS(args: string[], timeoutMs: number): Promise<string[]> {
  return new Promise((resolve) => {
    const proc = spawn(D, args, { stdio: ["ignore", "pipe", "ignore"] });
    let out = "";
    proc.stdout.on("data", (d: Buffer) => (out += d.toString()));
    const timer = setTimeout(() => {
      try {
        proc.kill();
      } catch {
        /* noop */
      }
      resolve(out.split("\n"));
    }, timeoutMs);
    proc.on("close", () => {
      clearTimeout(timer);
      resolve(out.split("\n"));
    });
  });
}

/** Extract advertised service types from `dns-sd -B _services._dns-sd._udp`. */
function parseServiceTypes(lines: string[]): string[] {
  const types = new Set<string>();
  for (const line of lines) {
    // Type name is the last field, prefixed with _ (e.g. "_airplay").
    const m = line.match(/(_[A-Za-z0-9-]+)\s*$/);
    if (!m) continue;
    const t = m[1];
    if (
      t.startsWith("_services") ||
      t.startsWith("_tcp") ||
      t.startsWith("_udp")
    )
      continue;
    types.add(t);
  }
  return [...types];
}

/** Extract instance names from `dns-sd -B` output. */
function parseBrowse(lines: string[], prefix?: string): string[] {
  const names = new Set<string>();
  for (const line of lines) {
    // Instance name is everything after the service type column (_tcp. / _udp.).
    const m = line.match(/_\w+\.(?:_tcp|_udp)\.\s+([A-Za-z0-9-_.@ ]+?)\s*$/);
    if (!m) continue;
    const name = m[1].trim();
    if (
      !name ||
      name.includes("Instance Name") ||
      name.startsWith("Browsing") ||
      name.startsWith("Lookup")
    )
      continue;
    if (prefix && name.startsWith(prefix)) continue;
    names.add(name);
  }
  return [...names];
}

interface LookupResult {
  hostname?: string;
  port?: number;
  txt: Record<string, string>;
}

/** Parse `dns-sd -L` output: the "can be reached at host:PORT" line + TXT. */
function parseLookup(lines: string[]): LookupResult {
  const out: LookupResult = { txt: {} };
  for (const line of lines) {
    if (!out.hostname) {
      // e.g. "Foo._airplay._tcp.local. can be reached at Foo.local.:7000 (iface)"
      const m = line.match(/can be reached at\s+([\w.-]+)\.:(\d+)?/);
      if (m) {
        out.hostname = m[1] + ".";
        if (m[2]) out.port = parseInt(m[2], 10);
      }
    }
    // TXT record: dns-sd prints one indented line containing all key=value pairs
    // space-separated, e.g. " acl=1 model=One manufacturer=Sonos flags=0x404".
    // Capture every key=value token on such lines.
    if (/^\s+[A-Za-z0-9_]+=/.test(line)) {
      const re = /([A-Za-z0-9_]+)=([^=]*?)(?=\s+[A-Za-z0-9_]+=|$)/g;
      let tm: RegExpExecArray | null;
      while ((tm = re.exec(line)) !== null) {
        const key = tm[1];
        let val = tm[2].trim();
        // dns-sd escapes spaces as \032 or as "\ " (backslash-space), and
        // parens as \( \). Unescape all three.
        val = val
          .replace(/\\032/g, " ")
          .replace(/\\ /g, " ")
          .replace(/\\([()])/g, "$1");
        // Trim trailing backslash escapes.
        val = val.replace(/\\$/, "").trim();
        if (val) out.txt[key] = val;
      }
    }
  }
  return out;
}

/** Extract IPv4 from `dns-sd -G v4` output. */
function parseGetAddr(lines: string[]): string | undefined {
  for (const line of lines) {
    const m = line.match(/\b(\d+\.\d+\.\d+\.\d+)\b/);
    if (m && !m[1].startsWith("0.") && m[1] !== "255.255.255.255") return m[1];
  }
  return undefined;
}

/** Strip MAC@ prefix and UUID suffixes for a cleaner friendly name. */
function cleanName(name: string): string {
  let n = name;
  const at = n.indexOf("@");
  if (at > 0) n = n.slice(at + 1);
  // strip trailing "-<long-uuid>" (32 hex)
  n = n.replace(/-[0-9a-f]{32}$/i, "");
  return n.trim() || name;
}

/** Pick the richest model string from a TXT record across known keys. */
function modelFromTXT(txt: Record<string, string>): string | undefined {
  return txt.md ?? txt.model ?? txt.ty ?? txt.product ?? txt["usb_MDL"];
}

/** Pick the manufacturer from a TXT record across known keys. */
function manufacturerFromTXT(txt: Record<string, string>): string | undefined {
  return txt.manufacturer ?? txt["usb_MFG"] ?? undefined;
}

/** HomeKit category id (`ci`) → friendly device class. */
const HAP_CATEGORY: Record<string, string> = {
  "1": "bridge",
  "2": "fan",
  "3": "garage",
  "4": "lightbulb",
  "5": "door",
  "6": "lock",
  "7": "outlet",
  "8": "switch",
  "9": "thermostat",
  "10": "sensor",
  "11": "security",
  "12": "doorbell",
  "13": "battery",
  "14": "camera",
  "15": "doorbellcamera",
};

export interface MDNSResult {
  nameByIP: Record<string, string>;
  typeByIP: Record<string, string>;
  servicesByIP: Record<string, MDNSService[]>;
  durationSec: number;
  nameCount: number;
}

/**
 * One mDNS refresh: discover types, browse instances, resolve each to a
 * hostname + port + TXT, then to an IPv4. Time-boxed (~20s total). Calls
 * `onName(ip, name, type)` for every resolved instance so the caller can
 * stream rows in live, and accumulates the full service set per IP in
 * `servicesByIP`. `onProgress` reports instance-resolution progress
 * `(done, total)` during the longest phase.
 */
export async function refreshMDNS(
  onName?: (
    ip: string,
    name: string,
    type: string,
    services: MDNSService[],
  ) => void,
  onProgress?: (done: number, total: number) => void,
): Promise<MDNSResult> {
  const start = Date.now();
  const nameByIP: Record<string, string> = {};
  const typeByIP: Record<string, string> = {};
  const servicesByIP: Record<string, MDNSService[]> = {};

  const emitService = (ip: string, name: string, svc: MDNSService) => {
    if (!servicesByIP[ip]) servicesByIP[ip] = [];
    // De-dupe by type (a device may advertise the same type twice on two
    // interfaces; keep the first with a port).
    if (!servicesByIP[ip].some((s) => s.type === svc.type)) {
      servicesByIP[ip].push(svc);
    }
    if (!nameByIP[ip]) {
      nameByIP[ip] = name;
      typeByIP[ip] = svc.type;
    }
    onName?.(ip, nameByIP[ip], typeByIP[ip], servicesByIP[ip]);
  };

  // 1. Discover advertised service types via the meta-browse.
  const metaLines = await runDNS(
    ["-B", "_services._dns-sd._udp", "local."],
    PER_PROCESS_MS,
  );
  const bare = parseServiceTypes(metaLines);
  // Meta gives bare names like "_airplay"; the browse needs "_airplay._tcp".
  const discovered = bare.map((t) => `${t}._tcp`);
  const types = Array.from(new Set([...CURATED_TYPES, ...discovered])).slice(
    0,
    MAX_TYPES,
  );

  // 2. Browse each type for instances (parallel, capped).
  const instanceResults = await Promise.all(
    types.map(async (type) => {
      const lines = await runDNS(["-B", type, "local."], PER_PROCESS_MS);
      return { type, instances: parseBrowse(lines) };
    }),
  );

  // 3. Resolve each instance → hostname + port + TXT (parallel, capped).
  const resolveTasks: { instance: string; type: string }[] = [];
  for (const { type, instances } of instanceResults) {
    for (const instance of instances.slice(0, 10)) {
      resolveTasks.push({ instance, type });
      if (resolveTasks.length >= MAX_INSTANCES) break;
    }
    if (resolveTasks.length >= MAX_INSTANCES) break;
  }

  const lookupResults = await Promise.all(
    resolveTasks.map(async ({ instance, type }) => {
      const lines = await runDNS(
        ["-L", instance, type, "local."],
        PER_PROCESS_MS,
      );
      const lk = parseLookup(lines);
      return { instance, type, ...lk };
    }),
  );

  // Report progress across the resolve-then-IP pipeline (the longest phase).
  const totalResolve = resolveTasks.length;
  let resolved = 0;
  onProgress?.(resolved, totalResolve);

  // 4. Resolve each hostname → IPv4 (parallel, capped).
  const uniqueHosts = Array.from(
    new Set(lookupResults.flatMap((r) => (r.hostname ? [r.hostname] : []))),
  );
  const ipResults = await Promise.all(
    uniqueHosts.map(async (hostname) => {
      const lines = await runDNS(["-G", "v4", hostname], PER_PROCESS_MS);
      resolved++;
      onProgress?.(resolved, totalResolve);
      return { hostname, ip: parseGetAddr(lines) };
    }),
  );
  const ipByHost = new Map(
    ipResults.flatMap((r) => (r.ip ? [[r.hostname, r.ip]] : [])),
  );

  // 5. Merge: per IP, the instance name + every advertised service (with
  // port + TXT-derived model/manufacturer/category).
  for (const { instance, type, hostname, port, txt } of lookupResults) {
    if (!hostname) continue;
    const ip = ipByHost.get(hostname);
    if (!ip) continue;
    const svc: MDNSService = {
      type,
      port,
      model: modelFromTXT(txt),
      manufacturer: manufacturerFromTXT(txt),
      category: txt.ci,
    };
    emitService(ip, cleanName(instance), svc);
  }

  return {
    nameByIP,
    typeByIP,
    servicesByIP,
    durationSec: (Date.now() - start) / 1000,
    nameCount: Object.keys(nameByIP).length,
  };
}

/** Map a HomeKit `ci` category id to a friendly device class. */
export function hapCategoryToClass(ci: string): string | undefined {
  return HAP_CATEGORY[ci];
}
