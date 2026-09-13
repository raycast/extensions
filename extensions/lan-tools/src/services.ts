import { execFile } from "node:child_process";
import { connect } from "node:net";
import { get } from "node:http";
import { connect as tlsConnect } from "node:tls";

/**
 * On-demand service probe for a single device. Uses `rustscan` for fast
 * full-range port discovery, then confirms each discovered port as a real
 * http/https/ssh service (so the panel shows named services, not raw ports).
 * Used by the device detail view (not the sweep — the sweep must stay under
 * the <30s gate).
 */

export type ServiceName = "http" | "https" | "ssh";

export interface ServiceResult {
  name: ServiceName;
  port: number;
}

// Known service ports — used to classify a discovered port quickly. Unknown
// ports are probed as http (HEAD) then TLS, so non-standard web servers still
// surface as `http`/`https`.
const HTTP_PORTS = new Set([80, 8080, 8000, 3000, 8008, 5000]);
const HTTPS_PORTS = new Set([443, 8443]);
const SSH_PORTS = new Set([22]);

// Home/IoT devices can take several seconds to answer (an nmap ARP sweep of
// this network saw hosts respond up to ~6s). 1.5s was quitting before many
// slow-but-alive devices could reply, so allow up to 8s per connection.
const CONFIRM_TIMEOUT_MS = 8000;

/** Spawn timeout for the rustscan subprocess. */
const RUSTSCAN_TIMEOUT_MS = 20000;

/** `which rustscan` result — cached after the first probe. */
let rustscanPath: string | null | undefined;

async function findRustscan(): Promise<string | null> {
  if (rustscanPath !== undefined) return rustscanPath;
  const { execFileSync } = await import("node:child_process");
  try {
    const out = execFileSync("/usr/bin/which", ["rustscan"], {
      encoding: "utf8",
    }).trim();
    rustscanPath = out || null;
  } catch {
    rustscanPath = null;
  }
  return rustscanPath;
}

/** Run rustscan and return the list of open TCP ports. `[]` if none/missing. */
function rustscanOpenPorts(
  host: string,
): Promise<{ ports: number[]; missing: boolean }> {
  return new Promise((resolve) => {
    const bin = rustscanPath;
    if (!bin) return resolve({ ports: [], missing: true });
    execFile(
      bin,
      [
        "-a",
        host,
        "-g",
        "-b",
        "5000",
        "-t",
        "1500",
        "--tries",
        "2",
        "--range",
        "1-11434",
      ],
      { timeout: RUSTSCAN_TIMEOUT_MS, maxBuffer: 1 << 16, encoding: "utf8" },
      (err, stdout) => {
        if (err) {
          // ENOENT means rustscan vanished between the which-check and spawn.
          if ((err as NodeJS.ErrnoException).code === "ENOENT") {
            rustscanPath = null;
            return resolve({ ports: [], missing: true });
          }
          return resolve({ ports: [], missing: false });
        }
        // greppable line: "<ip> -> [p1,p2,...]"
        const m = stdout.match(/->\s*\[([0-9,\s]*)\]/);
        if (!m) return resolve({ ports: [], missing: false });
        const ports = m[1]
          .split(",")
          .map((s) => parseInt(s.trim(), 10))
          .filter((p) => Number.isFinite(p) && p > 0);
        resolve({ ports: Array.from(new Set(ports)), missing: false });
      },
    );
  });
}

/** Real HTTP HEAD / — resolves true only when an HTTP server actually answers. */
function httpResponds(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = get(
      {
        host,
        port,
        path: "/",
        method: "HEAD",
        timeout: CONFIRM_TIMEOUT_MS,
        headers: { "User-Agent": "lan-radar/1.0" },
      },
      (res) => {
        res.resume();
        resolve(res.statusCode !== undefined);
      },
    );
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.on("error", () => resolve(false));
  });
}

/** HTTPS handshake via TLS — resolves true when the TLS layer establishes. */
function httpsResponds(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = tlsConnect({
      host,
      port,
      // Only send SNI for hostnames; RFC 6066 forbids SNI with an IP literal.
      servername: /^[0-9.]+$/.test(host) ? undefined : host,
      timeout: CONFIRM_TIMEOUT_MS,
      rejectUnauthorized: false,
    });
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      sock.destroy();
      resolve(ok);
    };
    sock.on("secureConnect", () => finish(true));
    sock.on("timeout", () => finish(false));
    sock.on("error", () => finish(false));
    sock.on("close", () => finish(false));
  });
}

/** SSH banner — resolves true when the host sends an `SSH-2.0-` greeting. */
function sshResponds(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = connect({ host, port, timeout: CONFIRM_TIMEOUT_MS });
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      sock.destroy();
      resolve(ok);
    };
    sock.on("connect", () => sock.write("\n"));
    sock.on("data", (chunk) => {
      if (/^SSH-/i.test(chunk.toString("utf8"))) finish(true);
    });
    sock.on("timeout", () => finish(false));
    sock.on("error", () => finish(false));
    sock.on("close", () => finish(false));
  });
}

/** Open a TCP socket and resolve true if the connection succeeds. */
function tcpConnect(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = connect({ host, port, timeout: CONFIRM_TIMEOUT_MS });
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      sock.destroy();
      resolve(ok);
    };
    sock.on("connect", () => finish(true));
    sock.on("timeout", () => finish(false));
    sock.on("error", () => finish(false));
    sock.on("close", () => finish(false));
  });
}

/**
 * Classify one discovered port as http/https/ssh by attempting the real
 * connection. Known ports skip the guessing; unknown ports try http then TLS.
 */
async function classifyPort(
  host: string,
  port: number,
): Promise<ServiceResult | undefined> {
  if (SSH_PORTS.has(port) && (await sshResponds(host, port)))
    return { name: "ssh", port };
  if (HTTPS_PORTS.has(port) && (await httpsResponds(host, port)))
    return { name: "https", port };
  if (HTTP_PORTS.has(port) && (await httpResponds(host, port)))
    return { name: "http", port };
  // Unknown port: probe as http first, then TLS — surfaces non-standard web.
  if (await httpResponds(host, port)) return { name: "http", port };
  if (await httpsResponds(host, port)) return { name: "https", port };
  return undefined;
}

export interface ProbeOutcome {
  services: ServiceResult[];
  /** rustscan binary was not found on PATH. */
  engineMissing: boolean;
}

/**
 * Probe `host` for http/https/ssh services. rustscan discovers open ports
 * fast across a bounded range; each discovered port is then confirmed by a
 * real HTTP GET / TLS handshake / SSH banner before being reported by name.
 * Returns the confirmed services, sorted http, https, ssh.
 */
export async function probeServices(host: string): Promise<ProbeOutcome> {
  await findRustscan();
  const { ports, missing } = await rustscanOpenPorts(host);
  if (missing) return { services: [], engineMissing: true };
  if (ports.length === 0) return { services: [], engineMissing: false };
  const confirmed = await Promise.all(ports.map((p) => classifyPort(host, p)));
  const services = confirmed
    .filter((r): r is ServiceResult => r !== undefined)
    .sort((a, b) => {
      const order: Record<ServiceName, number> = { http: 0, https: 1, ssh: 2 };
      return order[a.name] - order[b.name] || a.port - b.port;
    });
  return { services, engineMissing: false };
}

/** Keep a cheap TCP liveness check for callers that only need port reachability. */
export { tcpConnect as portOpen };
