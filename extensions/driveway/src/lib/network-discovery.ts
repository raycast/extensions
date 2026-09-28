import { execFile, ChildProcess } from "node:child_process";
import * as net from "node:net";
import * as https from "node:https";
import * as http from "node:http";
import * as os from "node:os";

import type { Protocol } from "./share";

export type DiscoveredHost = {
  host: string;
  protocol: Protocol;
};

// --- Bonjour / mDNS discovery ---
// Browsing (-B) yields instance names; resolving to hostnames is a second
// step (-L). dns-sd streams forever, so both are killed on a timer.

const BONJOUR_BROWSE_MS = 3_000;
const BONJOUR_RESOLVE_MS = 1_500;

function runDnsSd(args: string[], durationMs: number): Promise<string> {
  return new Promise((resolve) => {
    let child: ChildProcess;
    try {
      child = execFile("/usr/bin/dns-sd", args);
    } catch {
      resolve("");
      return;
    }
    let output = "";
    child.stdout?.on("data", (chunk) => {
      output += chunk;
    });
    const timer = setTimeout(() => child.kill(), durationMs);
    child.on("close", () => {
      clearTimeout(timer);
      resolve(output);
    });
    child.on("error", () => {
      clearTimeout(timer);
      resolve(output);
    });
  });
}

// The instance name is the last column and may contain spaces.
export function parseBrowseInstances(output: string): string[] {
  const names = new Set<string>();
  for (const line of output.split("\n")) {
    const match = line.match(/^\S+\s+Add\s+\S+\s+\S+\s+\S+\s+\S+\s+(.+?)\s*$/);
    if (match) names.add(match[1]);
  }
  return [...names];
}

// Matches "...can be reached at host.local.:445" in `dns-sd -L` output.
// Untested against a live advertising device; check here if nothing appears.
async function resolveInstanceHost(serviceType: string, instanceName: string): Promise<string | undefined> {
  const output = await runDnsSd(["-L", instanceName, serviceType, "local."], BONJOUR_RESOLVE_MS);
  const match = output.match(/can be reached at ([^\s:]+):/);
  return match ? match[1].replace(/\.$/, "") : undefined;
}

async function browseAndResolve(serviceType: string, protocol: DiscoveredHost["protocol"]): Promise<DiscoveredHost[]> {
  const browseOutput = await runDnsSd(["-B", serviceType, "local."], BONJOUR_BROWSE_MS);
  const instances = parseBrowseInstances(browseOutput);
  const resolved = await Promise.all(instances.map((name) => resolveInstanceHost(serviceType, name)));
  return resolved.filter((host): host is string => Boolean(host)).map((host) => ({ host, protocol }));
}

export async function discoverViaBonjour(): Promise<DiscoveredHost[]> {
  // Parallel, so the browse window isn't multiplied by service count.
  const [smb, webdav, webdavs] = await Promise.all([
    browseAndResolve("_smb._tcp", "smb"),
    // WebDAV rarely advertises this way, but check anyway. Each service
    // type maps to its own protocol so Add Drive isn't pre-filled wrongly.
    browseAndResolve("_webdav._tcp", "webdav-http"),
    browseAndResolve("_webdavs._tcp", "webdav"),
  ]);
  return [...smb, ...webdav, ...webdavs];
}

// --- Local subnet scan ---
//
// An open 445 is a strong SMB signal, but open 443/80 just means "a web
// server". WebDAV is confirmed by the "DAV:" OPTIONS header (RFC 4918).

const SUBNET_SCAN_CONNECT_TIMEOUT_MS = 800;
const SUBNET_SCAN_CONCURRENCY = 40;
const DAV_PROBE_TIMEOUT_MS = 1_500;
// Refuse a pathologically large range rather than opening thousands of sockets.
const MAX_SUBNET_HOSTS = 1024;

function ipToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

export function intToIp(value: number): string {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 0xff).join(".");
}

// Host range of the first active IPv4 interface, minus network/broadcast.
export function localSubnetRange(): { start: number; end: number } | undefined {
  const interfaces = os.networkInterfaces();
  for (const addrs of Object.values(interfaces)) {
    for (const addr of addrs ?? []) {
      if (addr.family !== "IPv4" || addr.internal) continue;
      const ip = ipToInt(addr.address);
      const mask = ipToInt(addr.netmask);
      const network = ip & mask;
      const broadcast = network | (~mask >>> 0);
      if (broadcast - network - 1 <= 0) continue;
      return { start: network + 1, end: broadcast - 1 };
    }
  }
  return undefined;
}

function checkPort(host: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

function checkDav(host: string, useTls: boolean, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const client = useTls ? https : http;
    const req = client.request(
      {
        host,
        port: useTls ? 443 : 80,
        method: "OPTIONS",
        path: "/",
        timeout: timeoutMs,
        // Probe only; real mounting still does its own trust prompt.
        rejectUnauthorized: false,
      },
      (res) => {
        resolve(Boolean(res.headers.dav));
        res.resume();
      },
    );
    req.on("timeout", () => req.destroy());
    req.on("error", () => resolve(false));
    req.end();
  });
}

async function scanHost(ip: string): Promise<DiscoveredHost[]> {
  const found: DiscoveredHost[] = [];
  const [smbOpen, httpsOpen, httpOpen] = await Promise.all([
    checkPort(ip, 445, SUBNET_SCAN_CONNECT_TIMEOUT_MS),
    checkPort(ip, 443, SUBNET_SCAN_CONNECT_TIMEOUT_MS),
    checkPort(ip, 80, SUBNET_SCAN_CONNECT_TIMEOUT_MS),
  ]);
  if (smbOpen) found.push({ host: ip, protocol: "smb" });
  // Tagged with the scheme actually confirmed, so Add Drive pre-fills right.
  if (httpsOpen && (await checkDav(ip, true, DAV_PROBE_TIMEOUT_MS))) found.push({ host: ip, protocol: "webdav" });
  if (httpOpen && (await checkDav(ip, false, DAV_PROBE_TIMEOUT_MS))) found.push({ host: ip, protocol: "webdav-http" });
  return found;
}

// Runs `check` across the subnet in bounded batches, reporting each batch
// via onBatch so results render progressively. Shared by the scan and sweep.
async function scanSubnet<T>(check: (ip: string) => Promise<T[]>, onBatch?: (found: T[]) => void): Promise<T[]> {
  const range = localSubnetRange();
  if (!range) return [];

  const count = range.end - range.start + 1;
  if (count <= 0 || count > MAX_SUBNET_HOSTS) return [];

  const ips: string[] = [];
  for (let i = range.start; i <= range.end; i++) ips.push(intToIp(i));

  const results: T[] = [];
  for (let i = 0; i < ips.length; i += SUBNET_SCAN_CONCURRENCY) {
    const batch = ips.slice(i, i + SUBNET_SCAN_CONCURRENCY);
    const batchResults = (await Promise.all(batch.map(check))).flat();
    if (batchResults.length) onBatch?.(batchResults);
    results.push(...batchResults);
  }
  return results;
}

export async function discoverViaSubnetScan(onBatch?: (found: DiscoveredHost[]) => void): Promise<DiscoveredHost[]> {
  return scanSubnet(scanHost, onBatch);
}

// --- Presence-only sweep ---
// Finder's Network tab lists devices offering no file sharing, via a legacy
// protocol dns-sd can't see. A ping sweep proves a host is alive, no more.
const PING_TIMEOUT_S = 1;
const PING_WAIT_MS = 800;

function pingHost(ip: string): Promise<string[]> {
  return new Promise((resolve) => {
    execFile("/sbin/ping", ["-c", "1", "-t", String(PING_TIMEOUT_S), "-W", String(PING_WAIT_MS), ip], (error) => {
      resolve(error ? [] : [ip]);
    });
  });
}

export async function discoverAllDevices(onBatch?: (found: string[]) => void): Promise<string[]> {
  return scanSubnet(pingHost, onBatch);
}

export function mergeDiscoveredHosts(...lists: DiscoveredHost[][]): DiscoveredHost[] {
  const seen = new Set<string>();
  const merged: DiscoveredHost[] = [];
  for (const list of lists) {
    for (const entry of list) {
      const key = `${entry.host.toLowerCase()}:${entry.protocol}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(entry);
    }
  }
  return merged;
}
