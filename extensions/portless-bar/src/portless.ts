import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { formatUrl, RouteStore, type RouteMapping } from "portless";

export type PortlessEntry = {
  id: string;
  title: string;
  domain: string;
  subdomain: string;
  hostname: string;
  port: number;
  pid: number;
  url: string;
  raw: string;
  keywords: string[];
};

export function getPortlessEntries() {
  const stateDir = getStateDir();
  const store = new RouteStore(stateDir);
  const proxyPort = readProxyPort(stateDir);
  const tls = readProxyTls(stateDir);

  return store.loadRoutes().map((route) => routeToEntry(route, proxyPort, tls));
}

function routeToEntry(
  route: RouteMapping,
  proxyPort: number,
  tls: boolean,
): PortlessEntry {
  const { domain, subdomain } = parseHostname(route.hostname);
  const url = formatUrl(route.hostname, proxyPort, tls);
  const label = route.pid === 0 ? "alias" : `pid ${route.pid}`;
  const raw = `${url} -> localhost:${route.port} (${label})`;
  const title = `${domain} ${subdomain} ${route.port}`;

  return {
    id: `${route.hostname}:${route.port}:${route.pid}`,
    title,
    domain,
    subdomain,
    hostname: route.hostname,
    port: route.port,
    pid: route.pid,
    url,
    raw,
    keywords: [
      route.hostname,
      domain,
      subdomain,
      String(route.port),
      url,
      `localhost:${route.port}`,
    ],
  };
}

export function killPortlessEntry(entry: PortlessEntry) {
  if (entry.pid === 0) {
    throw new Error(
      `Route ${entry.hostname} is an alias and does not have a process to kill.`,
    );
  }

  try {
    process.kill(entry.pid, "SIGTERM");
  } catch (error) {
    if (!isNoSuchProcess(error)) {
      throw error;
    }
  }

  new RouteStore(getStateDir()).removeRoute(entry.hostname);
}

function isNoSuchProcess(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ESRCH"
  );
}

function parseHostname(hostname: string) {
  const parts = hostname.split(".").filter(Boolean);

  if (parts.length >= 3) {
    return {
      domain: parts.at(-2) || hostname,
      subdomain: parts.slice(0, -2).join("."),
    };
  }

  if (parts.length === 2) {
    return {
      domain: parts.at(-1) || hostname,
      subdomain: parts[0] || hostname,
    };
  }

  return {
    domain: hostname,
    subdomain: hostname,
  };
}

function getStateDir() {
  return process.env.PORTLESS_STATE_DIR || path.join(os.homedir(), ".portless");
}

function readProxyPort(stateDir: string) {
  const port = readNumberFile(path.join(stateDir, "proxy.port"));

  if (port) {
    return port;
  }

  return readProxyTls(stateDir) ? 443 : 80;
}

function readProxyTls(stateDir: string) {
  const tlsMarker = readTextFile(path.join(stateDir, "proxy.tls"))?.trim();

  return tlsMarker !== "0";
}

function readNumberFile(filePath: string) {
  const value = Number.parseInt(readTextFile(filePath)?.trim() || "", 10);

  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function readTextFile(filePath: string) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return undefined;
  }
}
