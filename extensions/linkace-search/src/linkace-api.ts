import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createPacResolver, type FindProxyForURL } from "pac-resolver";
import { getProxyForUrl } from "proxy-from-env";
import { QuickJS } from "quickjs-wasi";
import { ProxyAgent, request, Socks5ProxyAgent } from "undici";
import {
  DEFAULT_SEARCH_FILTERS,
  type LinkAceApiError,
  type LinkAceLink,
  type LinkAceList,
  type LinkAcePaginatedResponse,
  type LinkAceTag,
  type SearchFilters,
} from "./types";

const execFileAsync = promisify(execFile);
const MACOS_PROXY_CACHE_TTL = 60_000;
const MAX_PAGE_SIZE = 500;

let quickJSPromise: Promise<QuickJS> | undefined;
let macOsProxySettingsCache:
  | {
      expiresAt: number;
      promise: Promise<MacOSProxySettings>;
    }
  | undefined;
const pacResolverCache = new Map<
  string,
  {
    expiresAt: number;
    promise: Promise<FindProxyForURL>;
  }
>();

type ProxySource =
  | "preference"
  | "environment"
  | "system-http"
  | "system-https"
  | "system-socks"
  | "system-pac"
  | "none";

type ProxyConfiguration = {
  proxyUrl?: string;
  source: ProxySource;
};

type MacOSProxySettings = Record<string, string>;

export async function fetchLinkSearchResults({
  baseUrl,
  apiKey,
  proxyUrl,
  query,
  filters,
  signal,
}: {
  baseUrl: string;
  apiKey: string;
  proxyUrl?: string;
  query: string;
  filters: SearchFilters;
  signal: AbortSignal;
}) {
  return await performLinkAceRequest<LinkAcePaginatedResponse<LinkAceLink>>({
    apiKey,
    proxyUrl,
    signal,
    url: buildLinkSearchUrl(baseUrl, query, filters),
  });
}

export async function fetchLinkDetails({
  baseUrl,
  apiKey,
  proxyUrl,
  linkId,
  signal,
}: {
  baseUrl: string;
  apiKey: string;
  proxyUrl?: string;
  linkId: number;
  signal: AbortSignal;
}) {
  return await performLinkAceRequest<LinkAceLink>({
    apiKey,
    proxyUrl,
    signal,
    url: buildLinkDetailsUrl(baseUrl, linkId),
  });
}

export async function fetchLists({
  baseUrl,
  apiKey,
  proxyUrl,
  signal,
}: {
  baseUrl: string;
  apiKey: string;
  proxyUrl?: string;
  signal: AbortSignal;
}) {
  return await performLinkAceRequest<LinkAcePaginatedResponse<LinkAceList>>({
    apiKey,
    proxyUrl,
    signal,
    url: buildTaxonomyUrl(baseUrl, "lists"),
  });
}

export async function fetchTags({
  baseUrl,
  apiKey,
  proxyUrl,
  signal,
}: {
  baseUrl: string;
  apiKey: string;
  proxyUrl?: string;
  signal: AbortSignal;
}) {
  return await performLinkAceRequest<LinkAcePaginatedResponse<LinkAceTag>>({
    apiKey,
    proxyUrl,
    signal,
    url: buildTaxonomyUrl(baseUrl, "tags"),
  });
}

export async function runConnectionTest({
  baseUrl,
  apiKey,
  proxyUrl,
  signal,
}: {
  baseUrl: string;
  apiKey: string;
  proxyUrl?: string;
  signal: AbortSignal;
}) {
  const searchUrl = buildLinkSearchUrl(baseUrl, "raycast", DEFAULT_SEARCH_FILTERS);
  const listsUrl = buildTaxonomyUrl(baseUrl, "lists", 1);
  const tagsUrl = buildTaxonomyUrl(baseUrl, "tags", 1);

  const [searchResult, listsResult, tagsResult] = await Promise.all([
    performLinkAceRequest<LinkAcePaginatedResponse<LinkAceLink>>({ apiKey, proxyUrl, signal, url: searchUrl }),
    performLinkAceRequest<LinkAcePaginatedResponse<LinkAceList>>({ apiKey, proxyUrl, signal, url: listsUrl }),
    performLinkAceRequest<LinkAcePaginatedResponse<LinkAceTag>>({ apiKey, proxyUrl, signal, url: tagsUrl }),
  ]);

  return {
    searchUrl,
    listsUrl,
    tagsUrl,
    searchResultCount: Array.isArray(searchResult.data) ? searchResult.data.length : 0,
    listsResultCount: Array.isArray(listsResult.data) ? listsResult.data.length : 0,
    tagsResultCount: Array.isArray(tagsResult.data) ? tagsResult.data.length : 0,
  };
}

export function buildLinkSearchUrl(baseUrl: string, query: string, filters: SearchFilters) {
  const url = new URL(`${baseUrl}/api/v2/search/links`);

  if (query.trim()) {
    url.searchParams.set("query", query.trim());
  }

  if (filters.searchTitle) {
    url.searchParams.set("search_title", "1");
  }

  if (filters.searchDescription) {
    url.searchParams.set("search_description", "1");
  }

  if (filters.visibility === "private") {
    url.searchParams.set("private_only", "1");
  }

  if (filters.brokenOnly) {
    url.searchParams.set("broken_only", "1");
  }

  if (filters.emptyLists) {
    url.searchParams.set("empty_lists", "1");
  } else if (filters.selectedListIds.length > 0) {
    url.searchParams.set("only_lists", filters.selectedListIds.join(","));
  }

  if (filters.emptyTags) {
    url.searchParams.set("empty_tags", "1");
  } else if (filters.selectedTagIds.length > 0) {
    url.searchParams.set("only_tags", filters.selectedTagIds.join(","));
  }

  url.searchParams.set("order_by", filters.sortOrder);
  url.searchParams.set("per_page", String(MAX_PAGE_SIZE));

  return url.toString();
}

export function buildLinkAceItemUrl(baseUrl: string, linkId: number) {
  return `${baseUrl}/links/${linkId}`;
}

export function buildLinkDetailsUrl(baseUrl: string, linkId: number) {
  return `${baseUrl}/api/v2/links/${linkId}`;
}

export function normalizeBaseUrl(rawUrl: string) {
  const trimmedUrl = rawUrl
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/api\/v2$/i, "");

  if (!trimmedUrl) {
    return trimmedUrl;
  }

  return /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;
}

export function resolveProxyUrl(requestUrl: string, configuredProxyUrl?: string) {
  const trimmedConfiguredProxy = configuredProxyUrl?.trim();

  if (trimmedConfiguredProxy) {
    return trimmedConfiguredProxy;
  }

  const proxyFromEnvironment = getProxyForUrl(requestUrl)?.trim();
  return proxyFromEnvironment || undefined;
}

export async function resolveProxyConfiguration(
  requestUrl: string,
  configuredProxyUrl?: string,
): Promise<ProxyConfiguration> {
  const trimmedConfiguredProxy = configuredProxyUrl?.trim();

  if (trimmedConfiguredProxy) {
    return { proxyUrl: trimmedConfiguredProxy, source: "preference" };
  }

  const proxyFromEnvironment = getProxyForUrl(requestUrl)?.trim();

  if (proxyFromEnvironment) {
    return { proxyUrl: proxyFromEnvironment, source: "environment" };
  }

  const systemProxyConfiguration = await resolveSystemProxyConfiguration(requestUrl);
  return systemProxyConfiguration ?? { source: "none" };
}

export function formatProxySource(source: ProxySource) {
  switch (source) {
    case "preference":
      return "Extension Preference";
    case "environment":
      return "Environment Variable";
    case "system-http":
    case "system-https":
      return "macOS System Proxy";
    case "system-socks":
      return "macOS System SOCKS Proxy";
    case "system-pac":
      return "macOS Proxy Auto-Config (PAC)";
    default:
      return "None";
  }
}

export function canSearchWithoutText(filters: SearchFilters) {
  return (
    filters.brokenOnly ||
    filters.emptyLists ||
    filters.emptyTags ||
    filters.selectedListIds.length > 0 ||
    filters.selectedTagIds.length > 0
  );
}

export function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

export function getReadableErrorMessage(error: unknown, proxyUrl?: string) {
  if (!(error instanceof Error)) {
    return "Unknown error while communicating with LinkAce.";
  }

  const errorWithCause = error as Error & {
    code?: string;
    cause?: {
      code?: string;
      message?: string;
    };
  };

  const code = errorWithCause.code ?? errorWithCause.cause?.code;
  const message = errorWithCause.cause?.message ?? errorWithCause.message;

  if (code === "UND_ERR_CONNECT_TIMEOUT") {
    return proxyUrl
      ? `Connection to LinkAce failed: ${message}`
      : `Connection to LinkAce failed: ${message}. If your environment requires a proxy, configure it in the extension preferences or use your system network settings.`;
  }

  if (code === "ENOTFOUND" || code === "ECONNREFUSED" || code === "ETIMEDOUT") {
    return `Network error while connecting to LinkAce: ${message}`;
  }

  return message || "Unknown error while communicating with LinkAce.";
}

async function performLinkAceRequest<T>({
  url,
  apiKey,
  proxyUrl,
  signal,
}: {
  url: string;
  apiKey: string;
  proxyUrl?: string;
  signal: AbortSignal;
}) {
  const proxyConfiguration = await resolveProxyConfiguration(url, proxyUrl);
  const dispatcher = createDispatcher(proxyConfiguration.proxyUrl);

  try {
    const response = await request(url, {
      method: "GET",
      signal,
      dispatcher,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${apiKey.trim()}`,
      },
    });

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(await getErrorMessage(response.statusCode, response.body));
    }

    return (await response.body.json()) as T;
  } finally {
    await dispatcher?.close();
  }
}

function createDispatcher(proxyUrl?: string) {
  if (!proxyUrl) {
    return undefined;
  }

  if (/^socks5?:\/\//i.test(proxyUrl)) {
    return new Socks5ProxyAgent(proxyUrl);
  }

  return new ProxyAgent(proxyUrl);
}

async function resolveSystemProxyConfiguration(requestUrl: string): Promise<ProxyConfiguration | undefined> {
  if (process.platform !== "darwin") {
    return undefined;
  }

  try {
    const settings = await getMacOsProxySettings();
    const request = new URL(requestUrl);

    if (request.protocol === "https:" && settings.HTTPSEnable === "1" && settings.HTTPSProxy && settings.HTTPSPort) {
      return {
        proxyUrl: `http://${settings.HTTPSProxy}:${settings.HTTPSPort}`,
        source: "system-https",
      };
    }

    if (settings.HTTPEnable === "1" && settings.HTTPProxy && settings.HTTPPort) {
      return {
        proxyUrl: `http://${settings.HTTPProxy}:${settings.HTTPPort}`,
        source: "system-http",
      };
    }

    if (settings.SOCKSEnable === "1" && settings.SOCKSProxy && settings.SOCKSPort) {
      return {
        proxyUrl: `socks5://${settings.SOCKSProxy}:${settings.SOCKSPort}`,
        source: "system-socks",
      };
    }

    if (settings.ProxyAutoConfigEnable === "1" && settings.ProxyAutoConfigURLString) {
      const pacProxyUrl = await resolvePacProxyUrl(settings.ProxyAutoConfigURLString, requestUrl);

      if (pacProxyUrl) {
        return {
          proxyUrl: pacProxyUrl,
          source: "system-pac",
        };
      }
    }
  } catch {
    return undefined;
  }

  return undefined;
}

async function getMacOsProxySettings() {
  if (macOsProxySettingsCache && macOsProxySettingsCache.expiresAt > Date.now()) {
    return await macOsProxySettingsCache.promise;
  }

  const promise = execFileAsync("/usr/sbin/scutil", ["--proxy"])
    .then(({ stdout }) => parseMacOsProxySettings(stdout))
    .catch((error) => {
      if (macOsProxySettingsCache?.promise === promise) {
        macOsProxySettingsCache = undefined;
      }

      throw error;
    });

  macOsProxySettingsCache = {
    expiresAt: Date.now() + MACOS_PROXY_CACHE_TTL,
    promise,
  };

  return await promise;
}

function parseMacOsProxySettings(output: string): MacOSProxySettings {
  const settings: MacOSProxySettings = {};
  const linePattern = /^\s*([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.+?)\s*$/;

  for (const line of output.split("\n")) {
    const match = line.match(linePattern);

    if (!match) {
      continue;
    }

    settings[match[1]] = match[2];
  }

  return settings;
}

async function resolvePacProxyUrl(pacUrl: string, requestUrl: string) {
  const resolver = await getPacResolver(pacUrl);
  const pacResult = await resolver(requestUrl);
  return parsePacProxyResult(pacResult);
}

async function getPacResolver(pacUrl: string) {
  const cachedResolver = pacResolverCache.get(pacUrl);

  if (cachedResolver && cachedResolver.expiresAt > Date.now()) {
    return await cachedResolver.promise;
  }

  const resolverPromise = (async () => {
    const response = await fetch(pacUrl, { method: "GET" });

    if (!response.ok) {
      throw new Error(`Could not download PAC file (${response.status})`);
    }

    const pacScript = await response.text();
    const vm = await getQuickJSInstance();
    return createPacResolver(vm, pacScript);
  })().catch((error) => {
    if (pacResolverCache.get(pacUrl)?.promise === resolverPromise) {
      pacResolverCache.delete(pacUrl);
    }

    throw error;
  });

  pacResolverCache.set(pacUrl, {
    expiresAt: Date.now() + MACOS_PROXY_CACHE_TTL,
    promise: resolverPromise,
  });

  return await resolverPromise;
}

async function getQuickJSInstance() {
  quickJSPromise ??= QuickJS.create();
  return await quickJSPromise;
}

function parsePacProxyResult(result: string) {
  const entries = result
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean);

  for (const entry of entries) {
    const [scheme, target] = entry.split(/\s+/, 2);

    if (!scheme) {
      continue;
    }

    const normalizedScheme = scheme.toUpperCase();

    if (normalizedScheme === "DIRECT") {
      return undefined;
    }

    if (!target) {
      continue;
    }

    if (normalizedScheme === "PROXY" || normalizedScheme === "HTTP" || normalizedScheme === "HTTPS") {
      return `http://${target}`;
    }

    if (normalizedScheme === "SOCKS" || normalizedScheme === "SOCKS5") {
      return `socks5://${target}`;
    }
  }

  return undefined;
}

function buildTaxonomyUrl(baseUrl: string, type: "lists" | "tags", perPage = MAX_PAGE_SIZE) {
  const url = new URL(`${baseUrl}/api/v2/${type}`);
  url.searchParams.set("order_by", "name");
  url.searchParams.set("order_dir", "asc");
  url.searchParams.set("per_page", String(perPage));
  return url.toString();
}

async function getErrorMessage(
  statusCode: number,
  body: { json: () => Promise<unknown>; text: () => Promise<string> },
) {
  const fallback = `LinkAce API Error (${statusCode})`;

  try {
    const payload = (await body.json()) as LinkAceApiError;
    const message = payload.message || payload.error || payload.detail;
    return message ? `${fallback}: ${message}` : fallback;
  } catch {
    try {
      const text = await body.text();
      return text ? `${fallback}: ${text}` : fallback;
    } catch {
      return fallback;
    }
  }
}
