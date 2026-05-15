import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

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

// --- Preferences ---

interface Preferences {
  controllerPort: string;
  secret: string;
}

function getApiBase(): string {
  const prefs = getPreferenceValues<Preferences>();
  const port = prefs.controllerPort || "9090";
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

/** Get config for streaming logs from Mihomo */
export function getLogStreamConfig(level = "info"): {
  url: string;
  headers: Record<string, string>;
} {
  return {
    url: `${getApiBase()}/logs?level=${level}`,
    headers: getHeaders(),
  };
}

// --- API Methods ---

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${getApiBase()}${path}`, {
    method: "GET",
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error(`API Error ${res.status}: ${res.statusText}`);
  }
  return (await res.json()) as T;
}

async function apiPut(path: string, body?: unknown): Promise<void> {
  const res = await fetch(`${getApiBase()}${path}`, {
    method: "PUT",
    headers: getHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`API Error ${res.status}: ${res.statusText}`);
  }
}

async function apiPatch(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${getApiBase()}${path}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
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

/** Get config for streaming connections from Mihomo */
export function getConnectionStreamConfig(): {
  url: string;
  headers: Record<string, string>;
} {
  const prefs = getPreferenceValues<Preferences>();
  let url = `${getApiBase().replace("http", "ws")}/connections`;
  if (prefs.secret) {
    url += `?token=${encodeURIComponent(prefs.secret)}`;
  }
  return {
    url,
    headers: getHeaders(),
  };
}

/** Close a specific connection */
export async function closeConnection(id: string): Promise<void> {
  await fetch(`${getApiBase()}/connections/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
}

/** Close all connections */
export async function closeAllConnections(): Promise<void> {
  await fetch(`${getApiBase()}/connections`, {
    method: "DELETE",
    headers: getHeaders(),
  });
}
