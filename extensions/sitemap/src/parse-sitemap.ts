import { XMLParser } from "fast-xml-parser";
import { z } from "zod";

export class SitemapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SitemapError";
  }
}

export type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

export type Page = {
  readonly url: string;
  readonly lastModified: string | undefined;
  readonly changefreq: string | undefined;
  readonly priority: string | undefined;
};

export type ParsedSitemap =
  | { readonly kind: "pages"; readonly pages: readonly Page[] }
  | { readonly kind: "index"; readonly sitemapUrls: readonly string[] };

const xmlParser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  trimValues: true,
  isArray: (tagName) => tagName === "url" || tagName === "sitemap",
});

const urlEntrySchema = z.object({
  loc: z.string().url(),
  lastmod: z.string().optional(),
  changefreq: z.string().optional(),
  priority: z.string().optional(),
});

const urlSetSchema = z.object({
  url: z.array(urlEntrySchema).default([]),
});

const sitemapIndexEntrySchema = z.object({
  loc: z.string().url(),
});

const sitemapIndexSchema = z.object({
  sitemap: z.array(sitemapIndexEntrySchema).default([]),
});

const emptyStringToEmptyObject = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (value === "" ? {} : value), schema);

const rootSchema = z.union([
  z.object({ urlset: emptyStringToEmptyObject(urlSetSchema) }),
  z.object({ sitemapindex: emptyStringToEmptyObject(sitemapIndexSchema) }),
]);

const MAX_SITEMAPS = 50;
const MAX_PAGES = 10_000;
const MAX_SITEMAP_BYTES = 5 * 1024 * 1024;
const MAX_SITEMAP_DEPTH = 5;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;

type TraversalState = {
  readonly origin: string;
  readonly signal: AbortSignal;
  readonly visited: Set<string>;
  sitemapCount: number;
  pageCount: number;
};

export function parseSitemapXml(xml: string): ParsedSitemap {
  const parsed = xmlParser.parse(xml);
  const root = rootSchema.parse(parsed);

  if ("urlset" in root) {
    return {
      kind: "pages",
      pages: root.urlset.url.map((entry) => ({
        url: entry.loc,
        lastModified: entry.lastmod,
        changefreq: entry.changefreq,
        priority: entry.priority,
      })),
    };
  }

  return {
    kind: "index",
    sitemapUrls: root.sitemapindex.sitemap.map((entry) => entry.loc),
  };
}

function isPrivateAddress(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (normalized === "localhost" || normalized === "::1" || normalized.startsWith("fe80:")) {
    return true;
  }

  const octets = normalized.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  return (
    octets[0] === 0 ||
    octets[0] === 10 ||
    octets[0] === 127 ||
    (octets[0] === 169 && octets[1] === 254) ||
    (octets[0] === 172 && octets[1] !== undefined && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  );
}

function assertTrustedSitemapUrl(value: string, origin: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new SitemapError(`Invalid sitemap URL: ${value}`);
  }

  if (
    (url.protocol !== "https:" && url.protocol !== "http:") ||
    url.origin !== origin ||
    isPrivateAddress(url.hostname)
  ) {
    throw new SitemapError("Sitemap URLs must use the same public HTTP(S) origin as the requested website");
  }

  return url;
}

function isRedirect(response: Response): boolean {
  return (
    response.status === 301 ||
    response.status === 302 ||
    response.status === 303 ||
    response.status === 307 ||
    response.status === 308
  );
}

async function readSitemapResponse(response: Response, url: URL): Promise<string> {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_SITEMAP_BYTES) {
    throw new SitemapError(`Sitemap exceeds the ${MAX_SITEMAP_BYTES / 1024 / 1024} MB size limit`);
  }

  const body = await response.arrayBuffer();
  if (body.byteLength > MAX_SITEMAP_BYTES) {
    throw new SitemapError(`Sitemap exceeds the ${MAX_SITEMAP_BYTES / 1024 / 1024} MB size limit`);
  }

  if (url.pathname.toLowerCase().endsWith(".xml.gz")) {
    try {
      return await new Response(new Blob([body]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
    } catch {
      throw new SitemapError("Could not decompress gzip sitemap");
    }
  }

  return new TextDecoder().decode(body);
}

export async function fetchSitemap(
  url: string,
  fetchFn: Fetch = fetch,
  origin = new URL(url).origin,
  signal: AbortSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS),
): Promise<string> {
  const { response, url: sitemapUrl } = await fetchTrusted(url, fetchFn, origin, signal);
  if (!response.ok) {
    throw new SitemapError(`Failed to fetch sitemap: ${response.status} ${response.statusText}`);
  }
  return readSitemapResponse(response, sitemapUrl);
}

async function fetchTrusted(
  url: string,
  fetchFn: Fetch,
  origin: string,
  signal: AbortSignal,
): Promise<{ readonly response: Response; readonly url: URL }> {
  let sitemapUrl = assertTrustedSitemapUrl(url, origin);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    const response = await fetchFn(sitemapUrl.toString(), { redirect: "manual", signal });
    if (isRedirect(response)) {
      const location = response.headers.get("location");
      if (!location) {
        throw new SitemapError("Sitemap redirect is missing a location");
      }
      sitemapUrl = assertTrustedSitemapUrl(new URL(location, sitemapUrl).toString(), origin);
      continue;
    }

    return { response, url: sitemapUrl };
  }

  throw new SitemapError("Sitemap redirected too many times");
}

function parseSitemapFromRobotsTxt(text: string): string | undefined {
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().startsWith("sitemap:")) {
      const url = trimmed.slice("sitemap:".length).trim();
      if (url.length > 0) {
        return url;
      }
    }
  }

  return undefined;
}

function looksLikeSitemap(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return pathname.endsWith(".xml") || pathname.endsWith(".xml.gz");
  } catch {
    return false;
  }
}

export async function discoverSitemapUrl(pageUrl: string, fetchFn: Fetch = fetch): Promise<string> {
  const trimmed = pageUrl.trim();

  if (looksLikeSitemap(trimmed)) {
    return trimmed;
  }

  let pageUrlObject: URL;
  try {
    pageUrlObject = new URL(trimmed);
  } catch {
    throw new SitemapError(`Invalid URL: ${trimmed}`);
  }
  assertTrustedSitemapUrl(pageUrlObject.toString(), pageUrlObject.origin);

  const candidateUrl = new URL("/sitemap.xml", pageUrlObject.origin).toString();
  try {
    const { response } = await fetchTrusted(
      candidateUrl,
      fetchFn,
      pageUrlObject.origin,
      AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    );
    if (response.ok) {
      return candidateUrl;
    }
  } catch {
    // Ignore and try robots.txt next.
  }

  const robotsUrl = new URL("/robots.txt", pageUrlObject.origin).toString();
  try {
    const { response: robotsResponse } = await fetchTrusted(
      robotsUrl,
      fetchFn,
      pageUrlObject.origin,
      AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    );
    if (robotsResponse.ok) {
      const robotsText = await robotsResponse.text();
      const sitemapUrl = parseSitemapFromRobotsTxt(robotsText);
      if (sitemapUrl) {
        return assertTrustedSitemapUrl(sitemapUrl, pageUrlObject.origin).toString();
      }
    }
  } catch {
    // Ignore and fall through to the error below.
  }

  throw new SitemapError(`Could not find sitemap for ${pageUrl}`);
}

export async function loadSitemapPages(
  url: string,
  fetchFn: Fetch = fetch,
  visited: Set<string> = new Set(),
  signal: AbortSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS),
): Promise<readonly Page[]> {
  const rootUrl = assertTrustedSitemapUrl(url.trim(), new URL(url.trim()).origin);
  const state: TraversalState = {
    origin: rootUrl.origin,
    signal,
    visited,
    sitemapCount: 0,
    pageCount: 0,
  };

  return loadSitemapPagesRecursive(rootUrl.toString(), fetchFn, state, 0);
}

async function loadSitemapPagesRecursive(
  url: string,
  fetchFn: Fetch,
  state: TraversalState,
  depth: number,
): Promise<readonly Page[]> {
  if (depth > MAX_SITEMAP_DEPTH) {
    throw new SitemapError(`Sitemap index exceeds the maximum depth of ${MAX_SITEMAP_DEPTH}`);
  }

  const normalizedUrl = assertTrustedSitemapUrl(url.trim(), state.origin).toString();
  if (state.visited.has(normalizedUrl)) {
    return [];
  }
  if (state.sitemapCount >= MAX_SITEMAPS) {
    throw new SitemapError(`Sitemap index exceeds the maximum of ${MAX_SITEMAPS} sitemap files`);
  }
  state.visited.add(normalizedUrl);
  state.sitemapCount++;

  const xml = await fetchSitemap(normalizedUrl, fetchFn, state.origin, state.signal);
  const parsed = parseSitemapXml(xml);

  if (parsed.kind === "pages") {
    if (state.pageCount + parsed.pages.length > MAX_PAGES) {
      throw new SitemapError(`Sitemap index exceeds the maximum of ${MAX_PAGES} pages`);
    }
    state.pageCount += parsed.pages.length;
    return parsed.pages;
  }

  const pages: Page[] = [];
  for (const sitemapUrl of parsed.sitemapUrls) {
    const subPages = await loadSitemapPagesRecursive(sitemapUrl, fetchFn, state, depth + 1);
    pages.push(...subPages);
  }
  return pages;
}
