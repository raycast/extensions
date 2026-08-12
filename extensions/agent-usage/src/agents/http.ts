type UndiciModule = typeof import("undici");
type UndiciProxyAgent = InstanceType<UndiciModule["ProxyAgent"]>;

const proxyAgents = new Map<string, UndiciProxyAgent>();
let undiciModulePromise: Promise<UndiciModule> | null = null;

function loadUndici(): Promise<UndiciModule> {
  undiciModulePromise ??= import("undici");
  return undiciModulePromise;
}

export function normalizeBearerToken(token: string): string {
  return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
}

export interface HttpFetchOptions {
  url: string;
  method?: "GET" | "POST";
  token?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  unauthorizedMessage?: string;
}

export interface HttpFetchError {
  type: "unauthorized" | "network_error" | "unknown";
  message: string;
}

export interface HttpFetchResult {
  data: unknown;
  error: HttpFetchError | null;
}

function getProxyUrl(url: string): string | null {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return null;
  }

  if (isNoProxyHost(parsedUrl.hostname, parsedUrl.port || getDefaultPort(parsedUrl.protocol))) {
    return null;
  }

  const proxyUrl =
    parsedUrl.protocol === "https:"
      ? process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy
      : process.env.HTTP_PROXY || process.env.http_proxy;
  const trimmedProxyUrl = proxyUrl?.trim();
  if (!trimmedProxyUrl || !/^https?:\/\//i.test(trimmedProxyUrl)) {
    return null;
  }

  return trimmedProxyUrl;
}

function getDefaultPort(protocol: string): string | undefined {
  if (protocol === "https:") {
    return "443";
  }
  if (protocol === "http:") {
    return "80";
  }
  return undefined;
}

function parseNoProxyEntry(entry: string): { hostname: string; port?: string } {
  if (entry.startsWith("[")) {
    const hostEnd = entry.indexOf("]");
    if (hostEnd !== -1) {
      const port = entry.slice(hostEnd + 1).startsWith(":") ? entry.slice(hostEnd + 2) : undefined;
      return { hostname: entry.slice(1, hostEnd), port };
    }
  }

  const colonIndex = entry.lastIndexOf(":");
  const hasPort = colonIndex > -1 && entry.indexOf(":") === colonIndex;
  return hasPort ? { hostname: entry.slice(0, colonIndex), port: entry.slice(colonIndex + 1) } : { hostname: entry };
}

function isNoProxyHost(hostname: string, port?: string): boolean {
  const noProxy = process.env.NO_PROXY || process.env.no_proxy;
  if (!noProxy) {
    return false;
  }

  const normalizedHostname = hostname.toLowerCase();
  return noProxy
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .some((entry) => {
      if (entry === "*") {
        return true;
      }
      const { hostname: entryHostname, port: entryPort } = parseNoProxyEntry(entry);
      const normalizedEntry = entryHostname.startsWith(".") ? entryHostname.slice(1) : entryHostname;
      if (entryPort && entryPort !== port) {
        return false;
      }
      return normalizedHostname === normalizedEntry || normalizedHostname.endsWith(`.${normalizedEntry}`);
    });
}

async function getProxyAgent(proxyUrl: string): Promise<UndiciProxyAgent> {
  const cachedAgent = proxyAgents.get(proxyUrl);
  if (cachedAgent) {
    return cachedAgent;
  }

  const { ProxyAgent } = await loadUndici();
  const agent = new ProxyAgent(proxyUrl);
  proxyAgents.set(proxyUrl, agent);
  return agent;
}

export async function httpFetch(options: HttpFetchOptions): Promise<HttpFetchResult> {
  const {
    url,
    method = "GET",
    token,
    headers = {},
    body,
    timeoutMs = 10000,
    unauthorizedMessage = "Authorization token expired or invalid. Please update it in extension settings.",
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const allHeaders: Record<string, string> = { ...headers };
  if (token) {
    allHeaders["Authorization"] = normalizeBearerToken(token);
  }

  try {
    const proxyUrl = getProxyUrl(url);
    const response = proxyUrl
      ? await (async () => {
          const { fetch: undiciFetch } = await loadUndici();
          return undiciFetch(url, {
            method,
            headers: allHeaders,
            body,
            signal: controller.signal,
            dispatcher: await getProxyAgent(proxyUrl),
          });
        })()
      : await fetch(url, { method, headers: allHeaders, body, signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.status === 401) {
      return { data: null, error: { type: "unauthorized", message: unauthorizedMessage } };
    }

    if (!response.ok) {
      return { data: null, error: { type: "unknown", message: `HTTP ${response.status}: ${response.statusText}` } };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      return {
        data: null,
        error: { type: "network_error", message: "Request timeout. Please check your network connection." },
      };
    }
    return {
      data: null,
      error: { type: "network_error", message: err instanceof Error ? err.message : "Network request failed" },
    };
  }
}
