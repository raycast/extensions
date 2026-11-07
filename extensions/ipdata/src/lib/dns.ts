import { promises as dns } from "node:dns";
import { version } from "./ip";

export interface Resolved {
  address: string;
  family: 4 | 6;
}

// All A and AAAA addresses of a hostname, IPv4 first, without duplicates.
export async function resolveHost(host: string): Promise<Resolved[]> {
  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("DNS lookup timed out")), 6000));
  let results: { address: string; family: number }[];
  try {
    results = await Promise.race([dns.lookup(host, { all: true, verbatim: true }), timeout]);
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOTFOUND" || code === "ENODATA") throw new Error(`${host} does not resolve to any address`);
    throw new Error(`Could not resolve ${host}: ${code ?? (e instanceof Error ? e.message : String(e))}`);
  }
  const seen = new Set<string>();
  const out: Resolved[] = [];
  for (const r of results) {
    const v = version(r.address);
    if (!v || seen.has(r.address)) continue;
    seen.add(r.address);
    out.push({ address: r.address, family: v });
  }
  out.sort((a, b) => a.family - b.family);
  return out;
}
