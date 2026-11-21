import { execFileSync } from "node:child_process";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import tls from "node:tls";

/**
 * Proxy routing for in-process HTTP reads.
 *
 * Raycast doesn't inherit the shell environment, so "system proxy" means the
 * proxy env vars when present, otherwise the macOS proxy from `scutil --proxy`.
 * Only plain http:// proxies are supported (via CONNECT); SOCKS goes direct.
 */

export interface SystemProxySettings {
  http?: URL;
  https?: URL;
  exceptions: string[];
  excludeSimpleHostnames: boolean;
}

const PROXY_ENV_KEYS = ["http_proxy", "HTTP_PROXY", "https_proxy", "HTTPS_PROXY", "all_proxy", "ALL_PROXY"];
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const SYSTEM_CACHE_MS = 30_000;
const CONNECT_TIMEOUT_MS = 30_000;

let systemCache: { at: number; value: SystemProxySettings | undefined } | undefined;

export function hasProxyEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  return PROXY_ENV_KEYS.some((key) => Boolean(env[key]?.trim()));
}

function bareHost(hostname: string): string {
  return hostname.replace(/^\[|\]$/g, "").toLowerCase();
}

function defaultPort(url: URL): number {
  return Number(url.port) || (url.protocol === "https:" ? 443 : 80);
}

function parseProxyUrl(value: string | undefined): URL | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`);
    return url.protocol === "http:" && url.hostname ? url : undefined;
  } catch {
    return undefined;
  }
}

/** Parse `scutil --proxy` output (a nested plist-ish dump). */
export function parseScutilProxy(output: string): SystemProxySettings | undefined {
  const values = new Map<string, string>();
  const exceptions: string[] = [];
  let inExceptions = false;
  for (const line of output.split("\n")) {
    if (inExceptions) {
      if (/^\s*}/.test(line)) inExceptions = false;
      else {
        const item = /^\s*\d+\s*:\s*(.+?)\s*$/.exec(line);
        if (item) exceptions.push(item[1]);
      }
      continue;
    }
    const entry = /^\s*(\w+)\s*:\s*(.*?)\s*$/.exec(line);
    if (!entry) continue;
    if (entry[1] === "ExceptionsList" && entry[2].startsWith("<array>")) inExceptions = true;
    else values.set(entry[1], entry[2]);
  }
  const proxyOf = (prefix: "HTTP" | "HTTPS"): URL | undefined => {
    if (values.get(`${prefix}Enable`) !== "1") return undefined;
    const host = values.get(`${prefix}Proxy`);
    if (!host) return undefined;
    const port = values.get(`${prefix}Port`) || (prefix === "HTTPS" ? "443" : "80");
    return parseProxyUrl(`http://${host.includes(":") ? `[${host}]` : host}:${port}`);
  };
  const settings: SystemProxySettings = {
    http: proxyOf("HTTP"),
    https: proxyOf("HTTPS"),
    exceptions,
    excludeSimpleHostnames: values.get("ExcludeSimpleHostnames") === "1",
  };
  return settings.http || settings.https ? settings : undefined;
}

/** macOS system proxy, re-read at most every 30 s so toggling it in Clash etc. is picked up. */
export function systemProxySettings(): SystemProxySettings | undefined {
  if (process.platform !== "darwin") return undefined;
  if (systemCache && Date.now() - systemCache.at < SYSTEM_CACHE_MS) return systemCache.value;
  let value: SystemProxySettings | undefined;
  try {
    value = parseScutilProxy(
      execFileSync("/usr/sbin/scutil", ["--proxy"], {
        encoding: "utf8",
        timeout: 2000,
        stdio: ["ignore", "pipe", "ignore"],
      }),
    );
  } catch {
    value = undefined;
  }
  systemCache = { at: Date.now(), value };
  return value;
}

function ipv4ToNumber(ip: string): number | undefined {
  if (!net.isIPv4(ip)) return undefined;
  return ip.split(".").reduce((acc, part) => acc * 256 + Number(part), 0);
}

function matchesPattern(host: string, port: number, rawPattern: string): boolean {
  let pattern = rawPattern.trim().toLowerCase();
  if (!pattern) return false;
  if (pattern === "*") return true;
  const portMatch = /^(.*[^:\]]):(\d+)$/.exec(pattern);
  if (portMatch && !net.isIPv6(pattern)) {
    if (Number(portMatch[2]) !== port) return false;
    pattern = portMatch[1];
  }
  pattern = bareHost(pattern);
  const cidr = /^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/.exec(pattern);
  if (cidr) {
    const ip = ipv4ToNumber(host);
    const base = ipv4ToNumber(cidr[1]);
    const bits = Number(cidr[2]);
    if (ip === undefined || base === undefined || bits > 32) return false;
    const size = 2 ** (32 - bits);
    return Math.floor(ip / size) === Math.floor(base / size);
  }
  if (pattern.includes("*")) {
    const regex = new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`);
    return regex.test(host);
  }
  pattern = pattern.replace(/^\./, "");
  return host === pattern || host.endsWith(`.${pattern}`);
}

function bypassedByList(host: string, port: number, list: string[]): boolean {
  return list.some((pattern) => matchesPattern(host, port, pattern));
}

function envNoProxy(): string[] {
  return (process.env.no_proxy || process.env.NO_PROXY || "").split(/[\s,]+/).filter(Boolean);
}

/** The http:// proxy to use for `targetUrl`, or undefined to connect directly. */
export function resolveProxy(targetUrl: URL, bypassProxy: boolean): URL | undefined {
  if (bypassProxy) return undefined;
  const host = bareHost(targetUrl.hostname);
  const port = defaultPort(targetUrl);
  if (LOCAL_HOSTS.has(host)) return undefined;
  const isHttps = targetUrl.protocol === "https:";

  if (hasProxyEnv()) {
    if (bypassedByList(host, port, envNoProxy())) return undefined;
    const env = process.env;
    const raw = isHttps
      ? env.https_proxy || env.HTTPS_PROXY || env.all_proxy || env.ALL_PROXY
      : env.http_proxy || env.HTTP_PROXY || env.all_proxy || env.ALL_PROXY;
    // SOCKS or other unsupported schemes: connect directly.
    return parseProxyUrl(raw);
  }

  const system = systemProxySettings();
  if (!system) return undefined;
  if (system.excludeSimpleHostnames && !host.includes(".") && !host.includes(":")) return undefined;
  if (bypassedByList(host, port, [...system.exceptions, ...envNoProxy()])) return undefined;
  return isHttps ? system.https : system.http;
}

/** Proxy env vars equivalent to the macOS system proxy, for curl/ffmpeg children. */
export function systemProxyEnv(): Record<string, string> {
  const system = systemProxySettings();
  if (!system) return {};
  const out: Record<string, string> = {};
  const strip = (url: URL) => url.href.replace(/\/$/, "");
  if (system.http) out.http_proxy = strip(system.http);
  if (system.https) out.https_proxy = strip(system.https);
  // curl's no_proxy understands suffixes, `*` and CIDR, but not glob patterns like `*.local`.
  const noProxy = new Set(["localhost", "127.0.0.1", "::1", ...envNoProxy()]);
  for (const pattern of system.exceptions) {
    const value = pattern.trim();
    if (value === "*") noProxy.add("*");
    else if (/^\*\.[^*]+$/.test(value)) noProxy.add(value.slice(1));
    else if (value && !value.includes("*")) noProxy.add(value);
  }
  out.no_proxy = out.NO_PROXY = [...noProxy].join(",");
  return out;
}

function connectError(message: string, fatal = false): Error {
  return Object.assign(new Error(message), { proxyError: true }, fatal ? { fatal: true } : {});
}

function openTunnel(
  proxy: URL,
  host: string,
  port: number,
  callback: (error: Error | null, socket?: net.Socket) => void,
): void {
  const authority = `${host.includes(":") ? `[${host}]` : host}:${port}`;
  const headers: http.OutgoingHttpHeaders = { Host: authority };
  if (proxy.username || proxy.password) {
    const credentials = `${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`;
    headers["Proxy-Authorization"] = `Basic ${Buffer.from(credentials).toString("base64")}`;
  }
  let done = false;
  const finish = (error: Error | null, socket?: net.Socket) => {
    if (done) {
      socket?.destroy();
      return;
    }
    done = true;
    callback(error, socket);
  };
  const request = http.request({
    host: bareHost(proxy.hostname),
    port: defaultPort(proxy),
    method: "CONNECT",
    path: authority,
    headers,
    agent: false,
  });
  request.setTimeout(CONNECT_TIMEOUT_MS, () =>
    request.destroy(
      connectError(`The proxy at ${proxy.host} didn't answer within ${CONNECT_TIMEOUT_MS / 1000} seconds.`),
    ),
  );
  request.once("connect", (response, socket, head) => {
    request.setTimeout(0);
    if (response.statusCode !== 200) {
      socket.destroy();
      const status = response.statusCode || 0;
      finish(
        connectError(
          status === 407
            ? `The proxy at ${proxy.host} requires authentication (HTTP 407). Add credentials to the proxy URL or turn on "Bypass Proxy".`
            : `The proxy at ${proxy.host} refused to connect to ${authority} (HTTP ${status} ${response.statusMessage || ""}).`.trim(),
          status === 407,
        ),
      );
      return;
    }
    if (head.length) socket.unshift(head);
    finish(null, socket);
  });
  request.once("error", (error) => {
    const code = (error as NodeJS.ErrnoException).code;
    finish(
      code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "EHOSTUNREACH"
        ? connectError(`Couldn't reach the proxy at ${proxy.host} (${code}). Is the proxy app running?`)
        : error,
    );
  });
  request.end();
}

type CreateConnection = (
  options: http.ClientRequestArgs & tls.ConnectionOptions,
  callback: (error: Error | null, socket?: net.Socket) => void,
) => net.Socket | undefined;

/**
 * A keep-alive agent for `targetUrl`. When a proxy applies, every connection is
 * an HTTP CONNECT tunnel (TLS-wrapped for https targets).
 */
export function agentFor(targetUrl: URL, bypassProxy: boolean, options: { maxSockets: number }): http.Agent {
  const isHttps = targetUrl.protocol === "https:";
  const agentOptions = { keepAlive: true, maxSockets: options.maxSockets };
  const agent = isHttps ? new https.Agent(agentOptions) : new http.Agent(agentOptions);
  const proxy = resolveProxy(targetUrl, bypassProxy);
  if (!proxy) return agent;

  const createConnection: CreateConnection = (connectOptions, callback) => {
    const host = bareHost(String(connectOptions.host || connectOptions.hostname || targetUrl.hostname));
    const port = Number(connectOptions.port) || defaultPort(targetUrl);
    openTunnel(proxy, host, port, (error, socket) => {
      if (error || !socket) {
        callback(error || new Error("Proxy tunnel failed."));
        return;
      }
      if (!isHttps) {
        callback(null, socket);
        return;
      }
      const servername = connectOptions.servername || (net.isIP(host) ? undefined : host);
      const secure = tls.connect({
        socket,
        servername,
        rejectUnauthorized: connectOptions.rejectUnauthorized,
        ca: connectOptions.ca,
        cert: connectOptions.cert,
        key: connectOptions.key,
        session: connectOptions.session,
        ALPNProtocols: ["http/1.1"],
      });
      callback(null, secure);
    });
    return undefined;
  };
  (agent as unknown as { createConnection: CreateConnection }).createConnection = createConnection;
  return agent;
}

/** Agents keyed by (protocol, proxy) so redirects to another host reuse or pick the right route. */
export class AgentPool {
  private readonly agents = new Map<string, http.Agent>();

  constructor(
    private readonly bypassProxy: boolean,
    private readonly maxSockets: number,
  ) {}

  get(url: URL): http.Agent {
    const proxy = resolveProxy(url, this.bypassProxy);
    const key = `${url.protocol}|${proxy?.href ?? "direct"}`;
    let agent = this.agents.get(key);
    if (!agent) {
      agent = agentFor(url, this.bypassProxy, { maxSockets: this.maxSockets });
      this.agents.set(key, agent);
    }
    return agent;
  }

  destroy(): void {
    for (const agent of this.agents.values()) agent.destroy();
    this.agents.clear();
  }
}
