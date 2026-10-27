import { execFile } from "node:child_process";

const NETSTAT = "/usr/sbin/netstat";
const NETSTAT_TIMEOUT_MS = 3000;

export interface TunnelCounters {
  iface: string;
  /** Total bytes received on the interface since it came up. */
  rx: number;
  /** Total bytes sent on the interface since it came up. */
  tx: number;
}

export type TunnelReading = TunnelCounters | { problem: string };

/** "10.1.2.3/24" becomes "10.1.2.3". */
export function clientIp(address: string): string {
  return address.split("/")[0].trim();
}

function netstat(): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(NETSTAT, ["-ibn"], { timeout: NETSTAT_TIMEOUT_MS }, (error, stdout) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}

/**
 * Parses `netstat -ibn`. Columns are Name Mtu Network Address Ipkts Ierrs Ibytes Opkts
 * Oerrs Obytes Coll, but Address is blank on some rows, so byte counts are read from the end.
 */
function parseRows(output: string) {
  return output
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter((cols) => cols.length >= 10)
    .map((cols) => ({
      // Interfaces that are down get a "*" suffix.
      name: cols[0].replace(/\*$/, ""),
      network: cols[2],
      address: cols.length >= 11 ? cols[3] : "",
      rx: Number(cols[cols.length - 5]),
      tx: Number(cols[cols.length - 2]),
    }));
}

/**
 * Finds the tunnel interface that holds the profile's client IP and reads its byte counters.
 * The IP is the only link between a profile and an interface, so anything other than exactly
 * one match is reported as a problem instead of guessed.
 */
function countersFor(rows: ReturnType<typeof parseRows>, ip: string): TunnelReading {
  const owners = new Set(rows.filter((row) => row.address === ip).map((row) => row.name));

  if (owners.size === 0) return { problem: `No network interface has the address ${ip}` };
  if (owners.size > 1) return { problem: `${ip} is on more than one interface (${[...owners].join(", ")})` };

  const [iface] = owners;
  const link = rows.find((row) => row.name === iface && row.network.startsWith("<Link#"));
  if (!link || !Number.isFinite(link.rx) || !Number.isFinite(link.tx)) {
    return { problem: `Couldn't read traffic counters for ${iface}` };
  }

  return { iface, rx: link.rx, tx: link.tx };
}

/** Reads the counters for several client IPs from a single `netstat` call. */
export async function readTunnelCounters(ips: string[]): Promise<Record<string, TunnelReading>> {
  const rows = parseRows(await netstat());
  return Object.fromEntries(ips.map((ip) => [ip, countersFor(rows, ip)]));
}
