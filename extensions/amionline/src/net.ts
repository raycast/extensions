import { execFile } from "child_process";
import { Resolver } from "dns";
import { connect } from "net";

/** Run a command and resolve its stdout (never rejects; returns "" on failure). */
function run(cmd: string, args: string[], timeoutMs = 4000): Promise<string> {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: timeoutMs }, (_err, stdout) => resolve(stdout ?? ""));
  });
}

export interface GatewayInfo {
  gateway: string | null;
  iface: string | null;
}

/** Read the active default route (macOS). No default route => effectively offline. */
export async function getDefaultGateway(): Promise<GatewayInfo> {
  const out = await run("/sbin/route", ["-n", "get", "default"]);
  const iface = out.match(/interface:\s*([\w.]+)/)?.[1] ?? null;
  let gateway = out.match(/gateway:\s*([0-9a-fA-F.:]+)/)?.[1] ?? null;
  // A point-to-point default (e.g. a Tailscale/VPN tunnel via utun) has an interface but no
  // gateway. Fall back to the physical underlay gateway so the local checks still work.
  if (!gateway) gateway = await getPhysicalGateway();
  return { gateway, iface };
}

/** The physical LAN gateway from the routing table, skipping point-to-point/tunnel routes. */
async function getPhysicalGateway(): Promise<string | null> {
  const out = await run("/usr/sbin/netstat", ["-rn", "-f", "inet"]);
  for (const line of out.split("\n")) {
    const m = line.match(/^default\s+(\d{1,3}(?:\.\d{1,3}){3})\s+\S+\s+(\S+)/);
    if (m && /^(en|bridge|bond)\d/.test(m[2])) return m[1];
  }
  return null;
}

/** Best-effort SSID for a Wi-Fi interface (may be redacted without Location permission). */
export async function getSSID(iface: string | null): Promise<string | null> {
  if (!iface) return null;
  const out = await run("/usr/sbin/networksetup", ["-getairportnetwork", iface]);
  const m = out.match(/Current Wi-Fi Network:\s*(.+)/);
  return m ? m[1].trim() : null;
}

/** Configured resolvers, in order, de-duplicated. */
export async function getDnsServers(): Promise<string[]> {
  const out = await run("/usr/sbin/scutil", ["--dns"]);
  const seen = new Set<string>();
  for (const m of out.matchAll(/nameserver\[[0-9]+\]\s*:\s*([0-9a-fA-F.:]+)/g)) {
    seen.add(m[1]);
  }
  return [...seen];
}

export interface PingResult {
  ok: boolean;
  latencyMs?: number;
}

/** ICMP ping (macOS ping needs no sudo). */
export async function ping(host: string, timeoutSec = 2): Promise<PingResult> {
  const out = await run("/sbin/ping", ["-c", "1", "-t", String(timeoutSec), host], (timeoutSec + 1) * 1000);
  const m = out.match(/time[=<]\s*([0-9.]+)\s*ms/);
  return m ? { ok: true, latencyMs: parseFloat(m[1]) } : { ok: false };
}

export interface TcpResult {
  reachable: boolean;
  refused: boolean;
  latencyMs?: number;
}

/**
 * TCP reachability. Key distinction:
 *   ECONNREFUSED => host is UP (port closed but reachable)
 *   timeout/other => unreachable
 */
export function tcpProbe(host: string, port: number, timeoutMs = 2000): Promise<TcpResult> {
  return new Promise((resolve) => {
    const start = Date.now();
    const sock = connect({ host, port });
    let done = false;
    const finish = (r: TcpResult) => {
      if (done) return;
      done = true;
      sock.destroy();
      resolve(r);
    };
    const timer = setTimeout(() => finish({ reachable: false, refused: false }), timeoutMs);
    sock.once("connect", () => {
      clearTimeout(timer);
      finish({ reachable: true, refused: false, latencyMs: Date.now() - start });
    });
    sock.once("error", (e: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      const refused = e.code === "ECONNREFUSED";
      finish({ reachable: refused, refused, latencyMs: refused ? Date.now() - start : undefined });
    });
  });
}

/** Gateway reachability with ICMP first, then TCP fallback for ICMP-filtered routers. */
export async function gatewayReachable(gw: string): Promise<PingResult> {
  const p = await ping(gw);
  if (p.ok) return p;
  for (const port of [53, 80, 443]) {
    const t = await tcpProbe(gw, port, 1200);
    if (t.reachable) return { ok: true, latencyMs: t.latencyMs };
  }
  return { ok: false };
}

export interface ResolveResult {
  ok: boolean;
  latencyMs?: number;
  addrs?: string[];
}

/**
 * Resolve a domain against a SPECIFIC server (c-ares, honors setServers).
 * Must use resolve4, since dns.lookup would query the OS resolver, not this server.
 */
export function resolveWith(server: string, domain: string, timeoutMs = 2500): Promise<ResolveResult> {
  return new Promise((resolve) => {
    const r = new Resolver({ timeout: timeoutMs, tries: 1 });
    try {
      r.setServers([server]);
    } catch {
      resolve({ ok: false });
      return;
    }
    const start = Date.now();
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      try {
        r.cancel();
      } catch {
        /* ignore */
      }
      resolve({ ok: false });
    }, timeoutMs + 250);
    r.resolve4(domain, (err, addrs) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (err || !addrs || addrs.length === 0) resolve({ ok: false });
      else resolve({ ok: true, latencyMs: Date.now() - start, addrs });
    });
  });
}

export interface VpnStatus {
  active: boolean;
  name?: string;
  via?: string;
}

const VPN_IFACE = /^(utun|ppp|ipsec|tap|tun)\d/;

/** Detect an active VPN: a connected system VPN, or an app VPN that owns the default route. */
export async function getVpnStatus(defaultIface: string | null): Promise<VpnStatus> {
  const nc = await run("/usr/sbin/scutil", ["--nc", "list"]);
  const connected = nc.split("\n").find((l) => /\(Connected\)/.test(l));
  if (connected) {
    return { active: true, name: connected.match(/"([^"]+)"/)?.[1], via: "system VPN" };
  }
  if (defaultIface && VPN_IFACE.test(defaultIface)) {
    return { active: true, via: defaultIface };
  }
  return { active: false };
}

export interface ProxyStatus {
  enabled: boolean;
  summary?: string;
}

/** Read the system proxy configuration (scutil --proxy). */
export async function getProxyStatus(): Promise<ProxyStatus> {
  const out = await run("/usr/sbin/scutil", ["--proxy"]);
  const get = (k: string) => out.match(new RegExp(`\\b${k}\\s*:\\s*(\\S+)`))?.[1];
  const parts: string[] = [];
  if (get("HTTPEnable") === "1") parts.push(`HTTP ${get("HTTPProxy") ?? ""}:${get("HTTPPort") ?? ""}`);
  if (get("HTTPSEnable") === "1") parts.push(`HTTPS ${get("HTTPSProxy") ?? ""}:${get("HTTPSPort") ?? ""}`);
  if (get("SOCKSEnable") === "1") parts.push(`SOCKS ${get("SOCKSProxy") ?? ""}:${get("SOCKSPort") ?? ""}`);
  if (get("ProxyAutoConfigEnable") === "1") parts.push(`PAC ${get("ProxyAutoConfigURLString") ?? ""}`.trim());
  return { enabled: parts.length > 0, summary: parts.join(", ") || undefined };
}
