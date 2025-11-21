import { LocalStorage, getPreferenceValues } from "@raycast/api";

interface Preferences {
  controllerUrl: string;
  secret?: string;
  proxyGroup: string;
  speedTestUrl: string;
  speedTestTimeout: string;
}

export type ProxyMode = "Rule" | "Global" | "Direct";

export type ProxyNode = {
  provider: string;
  name: string;
  type: string;
  alive?: boolean;
  lastDelay?: number;
  downloadSpeed?: number; // KB/s
  downloadSpeedText?: string; // formatted like "1.5 MB/s"
  server?: string;
  port?: number;
  updatedAt?: string;
};

type ProviderResponse = {
  providers: Record<
    string,
    {
      name: string;
      type: string;
      vehicleType?: string;
      updatedAt?: string;
      proxies: Array<{
        name: string;
        type: string;
        alive?: boolean;
        history?: Array<{ delay: number }>;
        server?: string;
        port?: number;
      }>;
    }
  >;
};

type SelectorGroup = {
  name: string;
  type: string;
  now?: string;
  all?: string[];
};

type DelayResponse = {
  delay: number;
};

type ProxyDetail = {
  name: string;
  type: string;
  server?: string;
  port?: number;
};

const EXCLUDES_KEY = "clash-verge-exclude-urls";

const preferences = getPreferenceValues<Preferences>();
const baseURL = preferences.controllerUrl.replace(/\/+$/, "");

function baseHeaders() {
  return {
    Accept: "application/json",
    ...(preferences.secret ? { Authorization: `Bearer ${preferences.secret}` } : {}),
  };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = new URL(path, baseURL).toString();
  const headers = {
    ...baseHeaders(),
    ...(init.headers as Record<string, string>),
  };
  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`HTTP ${response.status}: ${message || response.statusText}`);
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return (await response.json()) as T;
}

export async function fetchProviders(): Promise<{ providers: string[]; nodes: ProxyNode[] }> {
  const data = await request<ProviderResponse>("/providers/proxies");

  const providers: string[] = [];
  const nodes: ProxyNode[] = [];

  Object.values(data.providers ?? {}).forEach((provider) => {
    providers.push(provider.name);
    provider.proxies.forEach((proxy) => {
      nodes.push({
        provider: provider.name,
        name: proxy.name,
        type: proxy.type,
        alive: proxy.alive,
        lastDelay: proxy.history?.[proxy.history.length - 1]?.delay,
        server: proxy.server,
        port: proxy.port,
        updatedAt: provider.updatedAt,
      });
    });
  });

  // Try to load server details for nodes that don't have them
  const nodesWithoutServer = nodes.filter((n) => !n.server);
  const detailPromises = nodesWithoutServer.map(async (node) => {
    try {
      const detail = await fetchProxyDetail(node.name);
      node.server = detail.server;
      node.port = detail.port;
    } catch {
      // Ignore errors for individual nodes
    }
  });
  await Promise.allSettled(detailPromises);

  return { providers, nodes };
}

export async function refreshProvider(name: string): Promise<void> {
  const path = `/providers/proxies/${encodeURIComponent(name)}`;
  try {
    await request(path, { method: "POST" });
  } catch (postError) {
    try {
      await request(path, { method: "PUT" });
    } catch {
      throw postError;
    }
  }
}

export async function refreshProviders(names: string[]): Promise<void> {
  for (const name of names) {
    await refreshProvider(name);
  }
}

export async function fetchSelectorGroup(groupName: string): Promise<SelectorGroup> {
  return request(`/proxies/${encodeURIComponent(groupName)}`);
}

export async function switchProxy(groupName: string, nodeName: string): Promise<void> {
  await request(`/proxies/${encodeURIComponent(groupName)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: nodeName }),
  });
}

export async function runSpeedTest(name: string, url: string, timeout: number): Promise<number> {
  const qs = new URLSearchParams({ url, timeout: String(timeout) });
  const data = await request<DelayResponse>(`/proxies/${encodeURIComponent(name)}/delay?${qs.toString()}`);
  return data.delay;
}

export type SpeedTestResult = {
  name: string;
  delay: number | null;
  error?: string;
};

export async function runBatchSpeedTest(
  names: string[],
  url: string,
  timeout: number,
  onProgress?: (completed: number, total: number) => void,
): Promise<SpeedTestResult[]> {
  const results: SpeedTestResult[] = [];
  let completed = 0;

  // Run tests in parallel with concurrency limit
  const concurrency = 5;
  const chunks: string[][] = [];
  for (let i = 0; i < names.length; i += concurrency) {
    chunks.push(names.slice(i, i + concurrency));
  }

  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map(async (name) => {
        try {
          const delay = await runSpeedTest(name, url, timeout);
          return { name, delay };
        } catch (error) {
          return { name, delay: null, error: String(error) };
        }
      }),
    );
    results.push(...chunkResults);
    completed += chunk.length;
    onProgress?.(completed, names.length);
  }

  return results;
}

export async function testConnectivity(): Promise<{ ok: boolean; message: string; latency?: number }> {
  const start = Date.now();
  try {
    await request<{ mode?: ProxyMode }>("/configs");
    const latency = Date.now() - start;
    return { ok: true, message: "Controller is reachable", latency };
  } catch (error) {
    return { ok: false, message: String(error) };
  }
}

export async function fetchMode(): Promise<ProxyMode | undefined> {
  const data = await request<{ mode?: ProxyMode }>("/configs");
  return data.mode;
}

export async function updateMode(mode: ProxyMode): Promise<void> {
  await request("/configs", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
}

export async function fetchProxyDetail(name: string): Promise<ProxyDetail> {
  return request(`/proxies/${encodeURIComponent(name)}`);
}

export async function loadExcludeList(): Promise<string[]> {
  const value = await LocalStorage.getItem<string>(EXCLUDES_KEY);
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveExcludeList(list: string[]): Promise<void> {
  await LocalStorage.setItem(EXCLUDES_KEY, JSON.stringify(list));

  try {
    await request("/configs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bypass: list }),
    });
  } catch {
    // Some controllers may not support bypass; persist locally regardless.
  }
}

export function getProxyGroup(): string {
  return preferences.proxyGroup;
}

export function getSpeedTestConfig(): { url: string; timeout: number } {
  return {
    url: preferences.speedTestUrl,
    timeout: Number(preferences.speedTestTimeout) || 3000,
  };
}

export type DownloadSpeedResult = {
  speed: number; // KB/s
  speedText: string; // formatted like "1.5 MB/s"
};

export async function testDownloadSpeed(
  proxyName: string,
  testUrl?: string,
  testSize?: number,
): Promise<DownloadSpeedResult> {
  // Use a test file URL - default to Cloudflare's speed test
  const bytes = testSize ?? 1000000; // default 1MB
  const url = testUrl ?? `https://speed.cloudflare.com/__down?bytes=${bytes}`;

  // First switch to the proxy temporarily to test through it
  const currentGroup = preferences.proxyGroup;

  // Get current selection to restore later
  const selector = await fetchSelectorGroup(currentGroup);
  const originalNode = selector?.now;

  try {
    // Switch to target proxy
    await switchProxy(currentGroup, proxyName);

    // Small delay to ensure switch takes effect
    await new Promise((r) => setTimeout(r, 100));

    const startTime = Date.now();
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.arrayBuffer();
    const endTime = Date.now();

    const durationSec = (endTime - startTime) / 1000;
    const bytesDownloaded = data.byteLength;
    const speedKBps = bytesDownloaded / 1024 / durationSec;

    let speedText: string;
    if (speedKBps >= 1024) {
      speedText = `${(speedKBps / 1024).toFixed(1)} MB/s`;
    } else {
      speedText = `${speedKBps.toFixed(0)} KB/s`;
    }

    return { speed: speedKBps, speedText };
  } finally {
    // Restore original proxy
    if (originalNode) {
      await switchProxy(currentGroup, originalNode).catch(() => {});
    }
  }
}
