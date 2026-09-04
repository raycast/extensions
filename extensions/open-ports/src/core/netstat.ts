import { runCommand } from "./exec";
import { classifyExposure } from "./lsof";
import { Exposure, IpVersion, Listener } from "./types";

const NETSTAT = "/usr/sbin/netstat";
const NETSTAT_ARGS = ["-an", "-p", "tcp"] as const;

export const NETSTAT_COMMAND = `${NETSTAT} ${NETSTAT_ARGS.join(" ")}`;

/** One listening socket as the kernel reports it, with no process attached. */
export interface ListeningSocket {
  host: string;
  port: number;
  ipVersion: IpVersion;
}

/** A port that is listening but that `lsof` would not name for the current user. */
export interface HiddenListener {
  id: string;
  port: number;
  addresses: string[];
  ipVersions: IpVersion[];
  exposure: Exposure;
}

/**
 * `netstat` reports every listening socket on the machine without needing privileges, but
 * it cannot say which process owns one. `lsof` names the process but only for sockets the
 * current user may inspect. Reading both and subtracting gives the ports that exist yet
 * cannot be attributed - the ones an unprivileged scan silently drops.
 */
export async function fetchListeningSockets(): Promise<ListeningSocket[]> {
  const { stdout } = await runCommand(NETSTAT, NETSTAT_ARGS);
  return parseNetstat(stdout);
}

/**
 * Parses `netstat -an -p tcp` rows:
 *
 *     Proto Recv-Q Send-Q  Local Address          Foreign Address        (state)
 *     tcp4       0      0  127.0.0.1.8021         *.*                    LISTEN
 *     tcp6       0      0  ::1.8021               *.*                    LISTEN
 *
 * The port is separated from the host by the last dot, which holds for IPv4, for bare and
 * zoned IPv6, and for the `*` wildcard.
 */
export function parseNetstat(output: string): ListeningSocket[] {
  const sockets: ListeningSocket[] = [];

  for (const line of output.split("\n")) {
    const columns = line.trim().split(/\s+/);
    if (columns.length < 6 || columns[columns.length - 1] !== "LISTEN") continue;

    const ipVersion = columns[0] === "tcp4" ? "IPv4" : columns[0] === "tcp6" ? "IPv6" : undefined;
    if (!ipVersion) continue;

    const address = parseNetstatAddress(columns[3]);
    if (!address) continue;

    sockets.push({ ...address, ipVersion });
  }

  return sockets;
}

export function parseNetstatAddress(value: string): { host: string; port: number } | null {
  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;

  const port = Number(value.slice(separator + 1));
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;

  return { host: value.slice(0, separator), port };
}

/**
 * Sockets the kernel reports that no visible listener accounts for. Matching is done on
 * port plus IP version rather than on the host string, because lsof resolves names
 * (`localhost:7265`) while netstat stays numeric (`127.0.0.1.7265`); anything unmatched is
 * therefore under-reported rather than wrongly flagged.
 */
export function findHiddenListeners(
  sockets: readonly ListeningSocket[],
  listeners: readonly Listener[],
): HiddenListener[] {
  const attributed = new Set<string>();
  for (const listener of listeners) {
    for (const binding of listener.bindings) {
      attributed.add(`${binding.port}|${binding.ipVersion}`);
    }
  }

  const byPort = new Map<number, HiddenListener>();
  for (const socket of sockets) {
    if (attributed.has(`${socket.port}|${socket.ipVersion}`)) continue;

    const existing = byPort.get(socket.port);
    const address = formatSocket(socket);

    if (existing) {
      if (!existing.addresses.includes(address)) existing.addresses.push(address);
      if (!existing.ipVersions.includes(socket.ipVersion)) existing.ipVersions.push(socket.ipVersion);
      existing.exposure = mostExposed(existing.exposure, classifyExposure(socket.host));
      continue;
    }

    byPort.set(socket.port, {
      id: `hidden-${socket.port}`,
      port: socket.port,
      addresses: [address],
      ipVersions: [socket.ipVersion],
      exposure: classifyExposure(socket.host),
    });
  }

  const hidden = [...byPort.values()];
  for (const entry of hidden) {
    entry.addresses.sort();
    entry.ipVersions.sort();
  }

  return hidden.sort((a, b) => a.port - b.port);
}

/** Renders a socket the way lsof would, so both sections of the list read alike. */
function formatSocket(socket: ListeningSocket): string {
  const host = socket.ipVersion === "IPv6" && socket.host !== "*" ? `[${socket.host}]` : socket.host;
  return `${host}:${socket.port}`;
}

function mostExposed(a: Exposure, b: Exposure): Exposure {
  if (a === "all-interfaces" || b === "all-interfaces") return "all-interfaces";
  if (a === "specific" || b === "specific") return "specific";
  return "loopback";
}
