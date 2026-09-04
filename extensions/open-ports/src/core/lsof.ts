import { runCommand, runCommandAsAdmin } from "./exec";
import { isValidPid } from "./signals";
import { Binding, Exposure, IpVersion, Listener } from "./types";

const LSOF = "/usr/sbin/lsof";
const LSOF_ARGS = ["-P", "-iTCP", "-sTCP:LISTEN", "+c0"] as const;

/** The exact command behind this extension, surfaced in the UI so nothing is a black box. */
export const LSOF_COMMAND = `${LSOF} ${LSOF_ARGS.join(" ")}`;

const ADMIN_PROMPT = "Open Ports wants to list listening ports owned by all users.";

export interface ParsedRow {
  pid: number;
  command: string;
  user: string;
  binding: Binding;
}

export async function fetchListeners(options: { admin?: boolean } = {}): Promise<Listener[]> {
  const output = options.admin
    ? await runCommandAsAdmin(LSOF, LSOF_ARGS, ADMIN_PROMPT)
    : (await runCommand(LSOF, LSOF_ARGS)).stdout;

  return groupByProcessAndPort(parseLsof(output));
}

/**
 * Parses the default (column) output of `lsof -P -iTCP -sTCP:LISTEN +c0`:
 *
 *     COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME
 *
 * lsof escapes spaces and non-printable characters inside COMMAND as `\xNN`, so splitting
 * on whitespace stays correct even for names like `Google\x20Drive`. Anything that does not
 * look like an IPv4/IPv6 listening socket - the header row included - is skipped rather
 * than guessed at.
 */
export function parseLsof(output: string): ParsedRow[] {
  const rows: ParsedRow[] = [];

  for (const line of output.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;

    const columns = trimmed.split(/\s+/);
    if (columns.length < 9) continue;

    const pid = Number(columns[1]);
    const ipVersion = columns[4];
    if (!isValidPid(pid)) continue;
    if (ipVersion !== "IPv4" && ipVersion !== "IPv6") continue;

    const name = columns
      .slice(8)
      .join(" ")
      .replace(/\s*\(LISTEN\)\s*$/, "");
    const address = parseAddress(name);
    if (!address) continue;

    rows.push({
      pid,
      command: decodeLsofEscapes(columns[0]),
      user: decodeLsofEscapes(columns[2]),
      binding: {
        fd: columns[3],
        ipVersion: ipVersion as IpVersion,
        address: name,
        host: address.host,
        port: address.port,
        exposure: classifyExposure(address.host),
        raw: trimmed,
      },
    });
  }

  return rows;
}

/**
 * A process usually binds the same port more than once (IPv4 plus IPv6, or several
 * interfaces). Those rows collapse into a single entry keyed by process and port.
 */
export function groupByProcessAndPort(rows: readonly ParsedRow[]): Listener[] {
  const listeners = new Map<string, Listener>();

  for (const row of rows) {
    const id = `${row.pid}-${row.binding.port}`;
    const existing = listeners.get(id);

    if (existing) {
      existing.bindings.push(row.binding);
      continue;
    }

    listeners.set(id, {
      id,
      pid: row.pid,
      command: row.command,
      user: row.user,
      port: row.binding.port,
      bindings: [row.binding],
      ipVersions: [],
      exposure: "loopback",
    });
  }

  const result = [...listeners.values()];
  for (const listener of result) {
    listener.bindings.sort((a, b) => a.ipVersion.localeCompare(b.ipVersion) || a.address.localeCompare(b.address));
    listener.ipVersions = (["IPv4", "IPv6"] as const).filter((version) =>
      listener.bindings.some((binding) => binding.ipVersion === version),
    );
    listener.exposure = mostExposed(listener.bindings.map((binding) => binding.exposure));
  }

  return result.sort((a, b) => a.port - b.port || a.command.localeCompare(b.command) || a.pid - b.pid);
}

/** Accepts `*:7000`, `127.0.0.1:8080`, `localhost:1025` and `[fe80::1%en0]:9999`. */
export function parseAddress(name: string): { host: string; port: number } | null {
  const match = /^(\[[^\]]*\]|[^:]*):(\d{1,5})$/.exec(name);
  if (!match) return null;

  const port = Number(match[2]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;

  return { host: match[1].replace(/^\[|\]$/g, ""), port };
}

export function classifyExposure(host: string): Exposure {
  if (host === "*" || host === "0.0.0.0" || host === "::" || host === "") return "all-interfaces";
  if (host === "localhost" || host === "::1" || /^127\./.test(host)) return "loopback";
  return "specific";
}

function mostExposed(exposures: readonly Exposure[]): Exposure {
  if (exposures.includes("all-interfaces")) return "all-interfaces";
  if (exposures.includes("specific")) return "specific";
  return "loopback";
}

/** lsof escapes spaces and non-printable characters as \xNN. */
function decodeLsofEscapes(value: string): string {
  return value.replace(/\\x([0-9a-fA-F]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
}
