import { ProxyAgent, fetch as undiciFetch } from "undici";

const proxyAgents = new Map<string, ProxyAgent>();

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

  if (isNoProxyHost(parsedUrl.hostname)) {
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

function isNoProxyHost(hostname: string): boolean {
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
      const normalizedEntry = entry.startsWith(".") ? entry.slice(1) : entry;
      return normalizedHostname === normalizedEntry || normalizedHostname.endsWith(`.${normalizedEntry}`);
    });
}

function getProxyAgent(proxyUrl: string): ProxyAgent {
  const cachedAgent = proxyAgents.get(proxyUrl);
  if (cachedAgent) {
    return cachedAgent;
  }

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
      ? await undiciFetch(url, {
          method,
          headers: allHeaders,
          body,
          signal: controller.signal,
          dispatcher: getProxyAgent(proxyUrl),
        })
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
