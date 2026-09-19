import { promises as dnsp } from "dns";

function isPrivateIp(ip: string): boolean {
  if (ip.includes(":")) {
    const low = ip.toLowerCase();
    return low === "::1" || low.startsWith("fd") || low.startsWith("fc") || low.startsWith("fe80");
  }
  const p = ip.split(".").map((n) => parseInt(n, 10));
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return false;
  if (p[0] === 10) return true;
  if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
  if (p[0] === 192 && p[1] === 168) return true;
  if (p[0] === 127) return true;
  if (p[0] === 169 && p[1] === 254) return true;
  if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true; // CGNAT / Tailscale (RFC 6598)
  return false;
}

/** Classify a resolver IP as a local address or a public one. */
export function labelResolver(ip: string): string {
  return isPrivateIp(ip) ? "local" : "public resolver";
}

function shortenHost(host: string): string {
  const labels = host.replace(/\.$/, "").split(".");
  return labels.slice(-3).join(".");
}

export interface Upstream {
  ip: string;
  name?: string;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);
}

/**
 * Discover the public resolver actually used upstream. whoami.akamai.net resolves to the
 * querying resolver's own egress IP, and a reverse lookup then hints at the provider.
 * Uses the system resolver on purpose, so it reflects the real router-to-ISP path.
 */
export async function discoverUpstream(timeoutMs = 2500): Promise<Upstream | null> {
  try {
    const addrs = await withTimeout(dnsp.resolve4("whoami.akamai.net"), timeoutMs);
    const ip = addrs?.[0];
    if (!ip) return null;
    let name: string | undefined;
    try {
      const ptr = await withTimeout(dnsp.reverse(ip), timeoutMs);
      if (ptr?.[0]) name = shortenHost(ptr[0]);
    } catch {
      /* no PTR record */
    }
    return { ip, name };
  } catch {
    return null;
  }
}
