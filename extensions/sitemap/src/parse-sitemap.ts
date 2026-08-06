import { XMLParser } from "fast-xml-parser";
import { z } from "zod";

export class SitemapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SitemapError";
  }
}

export type Fetch = (input: string) => Promise<Response>;

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

export async function fetchSitemap(url: string, fetchFn: Fetch = fetch): Promise<string> {
  const response = await fetchFn(url);
  if (!response.ok) {
    throw new SitemapError(`Failed to fetch sitemap: ${response.status} ${response.statusText}`);
  }
  return response.text();
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
  const lower = url.toLowerCase();
  return lower.endsWith(".xml") || lower.endsWith(".xml.gz");
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

  const candidateUrl = new URL("/sitemap.xml", pageUrlObject.origin).toString();
  try {
    const response = await fetchFn(candidateUrl);
    if (response.ok) {
      return candidateUrl;
    }
  } catch {
    // Ignore and try robots.txt next.
  }

  const robotsUrl = new URL("/robots.txt", pageUrlObject.origin).toString();
  try {
    const robotsResponse = await fetchFn(robotsUrl);
    if (robotsResponse.ok) {
      const robotsText = await robotsResponse.text();
      const sitemapUrl = parseSitemapFromRobotsTxt(robotsText);
      if (sitemapUrl) {
        return sitemapUrl;
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
): Promise<readonly Page[]> {
  const normalizedUrl = url.trim();

  if (visited.has(normalizedUrl)) {
    return [];
  }
  visited.add(normalizedUrl);

  const xml = await fetchSitemap(normalizedUrl, fetchFn);
  const parsed = parseSitemapXml(xml);

  if (parsed.kind === "pages") {
    return parsed.pages;
  }

  const pages: Page[] = [];
  for (const sitemapUrl of parsed.sitemapUrls) {
    const subPages = await loadSitemapPages(sitemapUrl, fetchFn, visited);
    pages.push(...subPages);
  }
  return pages;
}
