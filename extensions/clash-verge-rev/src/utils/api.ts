import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import * as http from "http";
import * as net from "net";
import * as fs from "fs";

// --- Types ---

export interface ProxyItem {
  name: string;
  type: string;
  udp: boolean;
  history: { time: string; delay: number }[];
  all?: string[];
  now?: string;
}

export interface ProxiesResponse {
  proxies: Record<string, ProxyItem>;
}

export interface ProxyGroup {
  name: string;
  type: string;
  now: string;
  all: string[];
  proxies: ProxyItem[];
}

export interface ClashConfig {
  port: number;
  "socks-port": number;
  "mixed-port": number;
  mode: "rule" | "global" | "direct";
  "log-level": string;
  "allow-lan": boolean;
  [key: string]: unknown;
}

export interface ClashVersion {
  meta: boolean;
  version: string;
}

// --- Platform ---

/** Returns true when running on macOS */
function isMacOS(): boolean {
  return process.platform === "darwin";
}

// --- Preferences ---

interface Preferences {
  controllerPort: string;
  controllerSocket: string;
  secret: string;
}

// --- Unix Socket Agent for macOS ---

/** Default Unix socket path used by Clash Verge Rev on macOS */
const DEFAULT_MACOS_SOCKET = "/tmp/verge/verge-mihomo.sock";

/** Cached Unix socket agent (reused across requests) */
let socketAgent: http.Agent | null = null;

/**
 * Create or return cached HTTP agent that connects via Unix socket.
 * Returns null if Unix socket is not available.
 */
function getUnixSocketAgent(): http.Agent | null {
  const prefs = getPreferenceValues<Preferences>();
  const socketPath = prefs.controllerSocket || DEFAULT_MACOS_SOCKET;

  // Check if socket file exists
  if (!fs.existsSync(socketPath)) {
    return null;
  }

  if (!socketAgent) {
    socketAgent = new http.Agent();
    const origCreateConnection = socketAgent.createConnection.bind(socketAgent);
    socketAgent.createConnection = () => {
      return net.createConnection(socketPath);
    };
  }
  return socketAgent;
}

// --- API Base & Headers ---

function getApiBase(): string {
  const prefs = getPreferenceValues<Preferences>();
  const port = prefs.controllerPort || "9097";
  return `http://127.0.0.1:${port}`;
}

function getHeaders(): Record<string, string> {
  const prefs = getPreferenceValues<Preferences>();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (prefs.secret) {
    headers["Authorization"] = `Bearer ${prefs.secret}`;
  }
  return headers;
}

/**
 * Get fetch options with Unix socket agent on macOS, or plain options on Windows.
 * On macOS, if Unix socket is available, it is preferred over TCP.
 */
function getFetchOptions(
  method: string,
  headers: Record<string, string>,
  body?: string,
): Record<string, unknown> {
  const opts: Record<string, string | Record<string, string> | http.Agent> = {
    method,
    headers,
  };
  if (body) {
    opts.body = body;
  }

  // On macOS, try Unix socket agent first
  if (isMacOS()) {
    const agent = getUnixSocketAgent();
    if (agent) {
      opts.agent = agent;
    }
  }

  return opts;
}

// --- Log Streaming ---

/** Get config for streaming logs from Mihomo */
export function getLogStreamConfig(level = "info"): {
  url: string;
  headers: Record<string, string>;
  agent?: http.Agent;
} {
  const headers = getHeaders();
  const result: { url: string; headers: Record<string, string>; agent?: http.Agent } = {
    url: `${getApiBase()}/logs?level=${level}`,
    headers,
  };

  // On macOS, provide Unix socket agent for fetch-based log streaming
  if (isMacOS()) {
    const agent = getUnixSocketAgent();
    if (agent) {
      result.agent = agent;
    }
  }

  return result;
}

// --- API Methods ---

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${getApiBase()}${path}`, getFetchOptions("GET", getHeaders()));
  if (!res.ok) {
    throw new Error(`API Error ${res.status}: ${res.statusText}`);
  }
  return (await res.json()) as T;
}

async function apiPut(path: string, body?: unknown): Promise<void> {
  const res = await fetch(
    `${getApiBase()}${path}`,
    getFetchOptions("PUT", getHeaders(), body ? JSON.stringify(body) : undefined),
  );
  if (!res.ok) {
    throw new Error(`API Error ${res.status}: ${res.statusText}`);
  }
}

async function apiPatch(path: string, body: unknown): Promise<void> {
  const res = await fetch(
    `${getApiBase()}${path}`,
    getFetchOptions("PATCH", getHeaders(), JSON.stringify(body)),
  );
  if (!res.ok) {
    throw new Error(`API Error ${res.status}: ${res.statusText}`);
  }
}

async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${getApiBase()}${path}`, getFetchOptions("DELETE", getHeaders()));
  if (!res.ok) {
    throw new Error(`API Error ${res.status}: ${res.statusText}`);
  }
}

/** Get all proxies and proxy groups */
export async function getProxies(): Promise<ProxiesResponse> {
  return apiGet<ProxiesResponse>("/proxies");
}

/** Get details for a specific proxy or group */
export async function getProxy(name: string): Promise<ProxyItem> {
  return apiGet<ProxyItem>(`/proxies/${encodeURIComponent(name)}`);
}

/** Switch the selected proxy for a group */
export async function selectProxy(group: string, name: string): Promise<void> {
  await apiPut(`/proxies/${encodeURIComponent(group)}`, { name });
}

/** Test delay for a specific proxy */
export async function getProxyDelay(
  name: string,
  url = "http://www.gstatic.com/generate_204",
  timeout = 5000,
): Promise<{ delay: number }> {
  return apiGet<{ delay: number }>(
    `/proxies/${encodeURIComponent(name)}/delay?url=${encodeURIComponent(url)}&timeout=${timeout}`,
  );
}

/** Get current Clash configuration */
export async function getConfigs(): Promise<ClashConfig> {
  return apiGet<ClashConfig>("/configs");
}

/** Patch Clash configuration (e.g., change mode) */
export async function patchConfigs(data: Partial<ClashConfig>): Promise<void> {
  await apiPatch("/configs", data);
}

/** Force reload configuration */
export async function reloadConfigs(path?: string): Promise<void> {
  await apiPut("/configs?force=true", path ? { path } : {});
}

/** Get Clash version info */
export async function getVersion(): Promise<ClashVersion> {
  return apiGet<ClashVersion>("/version");
}

/**
 * Parse proxies response into organized proxy groups.
 * Filters out internal entries like DIRECT, REJECT, GLOBAL, etc.
 */
export function parseProxyGroups(data: ProxiesResponse): ProxyGroup[] {
  const groups: ProxyGroup[] = [];
  const internalNames = new Set(["DIRECT", "REJECT", "GLOBAL", "PASS"]);

  for (const [name, proxy] of Object.entries(data.proxies)) {
    // Only include group-type proxies (Selector, URLTest, Fallback, LoadBalance)
    if (proxy.all && proxy.all.length > 0 && !internalNames.has(name)) {
      const proxies: ProxyItem[] = proxy.all
        .map((pName) => data.proxies[pName])
        .filter((p): p is ProxyItem => p !== undefined);

      groups.push({
        name,
        type: proxy.type,
        now: proxy.now || "",
        all: proxy.all,
        proxies,
      });
    }
  }

  return groups;
}

/**
 * Get the latest delay for a proxy from its history.
 * Returns 0 if no history available.
 */
export function getLatestDelay(proxy: ProxyItem): number {
  if (proxy.history && proxy.history.length > 0) {
    return proxy.history[proxy.history.length - 1].delay;
  }
  return 0;
}

/**
 * Format delay value for display
 */
export function formatDelay(delay: number): string {
  if (delay === 0) return "—";
  if (delay < 0) return "timeout";
  return `${delay}ms`;
}

// --- Connection Streaming ---

/** Polling interval for connection updates when WebSocket is not available (macOS Unix socket) */
const CONNECTION_POLL_INTERVAL = 1000;

/**
 * Get config for streaming connections from Mihomo.
 * On Windows: uses WebSocket (ws://).
 * On macOS with Unix socket: returns HTTP polling config instead,
 * because browser WebSocket API doesn't support Unix sockets.
 */
export function getConnectionStreamConfig(): {
  url: string;
  headers: Record<string, string>;
  usePolling?: boolean;
  pollInterval?: number;
  agent?: http.Agent;
} {
  const prefs = getPreferenceValues<Preferences>();
  const headers = getHeaders();

  // On macOS with Unix socket, use HTTP polling instead of WebSocket
  if (isMacOS()) {
    const agent = getUnixSocketAgent();
    if (agent) {
      return {
        url: `${getApiBase()}/connections`,
        headers,
        usePolling: true,
        pollInterval: CONNECTION_POLL_INTERVAL,
        agent,
      };
    }
  }

  // Windows or macOS with TCP: use WebSocket
  let url = `${getApiBase().replace("http", "ws")}/connections`;
  if (prefs.secret) {
    url += `?token=${encodeURIComponent(prefs.secret)}`;
  }
  return {
    url,
    headers,
    usePolling: false,
  };
}

/** Close a specific connection */
export async function closeConnection(id: string): Promise<void> {
  await apiDelete(`/connections/${id}`);
}

/** Close all connections */
export async function closeAllConnections(): Promise<void> {
  await apiDelete("/connections");
}
