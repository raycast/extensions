import { XMLParser, XMLValidator } from "fast-xml-parser";
import { z } from "zod";
import {
  assertTrustedUrl,
  createUrlPolicy,
  trustedHttp,
  TrustedHttpError,
  type TrustedHttp,
  type TrustedResponse,
  type UrlPolicy,
} from "./trusted-http";

const MAX_SITEMAPS = 4096;
const MAX_ENTRIES = 10_000;
const MAX_SITEMAP_BYTES = 1024 * 1024;
const MAX_TOTAL_BYTES = 5 * 1024 * 1024;
const MAX_DEPTH = 5;
const TIMEOUT_MS = 10_000;
const DOCTYPE_ERROR = "Sitemaps must not contain a DOCTYPE";

export class SitemapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SitemapError";
  }
}

export type SitemapEntry = {
  readonly url: string;
  readonly lastModified: string | undefined;
  readonly changeFrequency: string | undefined;
  readonly priority: string | undefined;
};

export type ParsedSitemap =
  | { readonly kind: "entries"; readonly entries: readonly SitemapEntry[] }
  | { readonly kind: "index"; readonly sitemapUrls: readonly string[] };

export type SitemapLoader = {
  load(websiteUrl: string): Promise<readonly SitemapEntry[]>;
};

const xmlParser = new XMLParser({
  ignoreAttributes: true,
  ignoreDeclaration: true,
  parseTagValue: false,
  processEntities: false,
  trimValues: true,
  isArray: (tagName) => tagName === "url" || tagName === "sitemap",
});

const entrySchema = z.object({
  loc: z.string(),
  lastmod: z.unknown().optional(),
  changefreq: z.unknown().optional(),
  priority: z.unknown().optional(),
});
const urlSetSchema = z.object({ url: z.array(entrySchema).default([]) });
const sitemapIndexSchema = z.object({ sitemap: z.array(z.object({ loc: z.string() })).default([]) });
const emptyElement = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (value === "" ? {} : value), schema);
const rootSchema = z.union([
  z.object({ urlset: emptyElement(urlSetSchema) }).strict(),
  z.object({ sitemapindex: emptyElement(sitemapIndexSchema) }).strict(),
]);

export function parseSitemapXml(xml: string, websiteUrl: string): ParsedSitemap {
  if (/<!DOCTYPE\b/i.test(xml)) throw new SitemapError(DOCTYPE_ERROR);
  if (/<!ENTITY\b/i.test(xml)) throw new SitemapError("Sitemaps must not contain entities");
  if (/&(?!(?:amp|apos|gt|lt|quot);|#(?:\d+|x[\da-f]+);)[a-z][\w.-]*;/i.test(xml)) {
    throw new SitemapError("Sitemaps must not contain undeclared entities");
  }
  const rootEnd = [...xml.matchAll(/<\/(?:urlset|sitemapindex)\s*>|<(?:urlset|sitemapindex)\b[^>]*\/\s*>/gi)].at(-1);
  const trailingContent = rootEnd
    ? xml.slice((rootEnd.index ?? 0) + rootEnd[0].length).replace(/<!--[\s\S]*?-->/g, "")
    : "";
  if (trailingContent.trim()) throw new SitemapError("The sitemap contains malformed XML");
  if (XMLValidator.validate(xml) !== true) throw new SitemapError("The sitemap contains malformed XML");

  let root: z.infer<typeof rootSchema>;
  try {
    root = rootSchema.parse(xmlParser.parse(xml));
  } catch {
    throw new SitemapError("The sitemap has an unsupported structure");
  }
  const policy = createUrlPolicy(websiteUrl);

  if ("urlset" in root) {
    return {
      kind: "entries",
      entries: root.urlset.url.map((entry) => ({
        url: assertSitemapUrl(entry.loc, policy, "Sitemap Entry").toString(),
        lastModified: validLastModified(entry.lastmod),
        changeFrequency: validChangeFrequency(entry.changefreq),
        priority: validPriority(entry.priority),
      })),
    };
  }

  return {
    kind: "index",
    sitemapUrls: root.sitemapindex.sitemap.map((entry) => assertSitemapUrl(entry.loc, policy, "Sitemap").toString()),
  };
}

function assertSitemapUrl(value: string, policy: UrlPolicy, kind: string): URL {
  try {
    return assertTrustedUrl(decodePredefinedEntities(value), policy);
  } catch {
    throw new SitemapError(`${kind} URLs must belong to the same public website`);
  }
}

function decodePredefinedEntities(value: string): string {
  const entities: Readonly<Record<string, string>> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    quot: '"',
  };
  return value.replace(/&(amp|apos|gt|lt|quot);/g, (entity, name: string) => entities[name] ?? entity);
}

function validLastModified(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  if (!value.includes("T")) {
    const [year, month, day] = value.split("-").map(Number);
    if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day)
      return undefined;
  }
  return value;
}

function validChangeFrequency(value: unknown): string | undefined {
  return typeof value === "string" &&
    ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"].includes(value)
    ? value
    : undefined;
}

function validPriority(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^(?:0(?:\.\d+)?|1(?:\.0+)?)$/.test(value)) return undefined;
  return value;
}

function looksLikeSitemap(url: URL): boolean {
  const pathname = url.pathname.toLowerCase();
  return pathname.endsWith(".xml") || pathname.endsWith(".xml.gz");
}

function sitemapUrlsFromRobots(text: string, policy: UrlPolicy): readonly string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.toLowerCase().startsWith("sitemap:"))
    .map((line) => line.slice("sitemap:".length).trim())
    .filter(Boolean)
    .map((url) => assertSitemapUrl(url, policy, "Sitemap").toString());
}

type TraversalState = {
  readonly policy: UrlPolicy;
  readonly signal: AbortSignal;
  readonly visited: Set<string>;
  readonly prefetched: Map<string, TrustedResponse>;
  sitemapCount: number;
  entryCount: number;
  totalBytes: number;
};

export function createSitemapLoader(http: TrustedHttp): SitemapLoader {
  return {
    async load(websiteUrl) {
      const trimmedUrl = websiteUrl.trim();
      let website: URL;
      let policy: UrlPolicy;
      try {
        policy = createUrlPolicy(trimmedUrl);
        website = assertTrustedUrl(trimmedUrl, policy);
      } catch {
        throw new SitemapError("Enter a valid public HTTP(S) website URL");
      }
      const signal = AbortSignal.timeout(TIMEOUT_MS);
      const state: TraversalState = {
        policy,
        signal,
        visited: new Set(),
        prefetched: new Map(),
        sitemapCount: 0,
        entryCount: 0,
        totalBytes: 0,
      };

      try {
        const sitemapUrls = looksLikeSitemap(website)
          ? [website.toString()]
          : await discoverSitemapUrls(website, http, state);
        const entries: SitemapEntry[] = [];
        for (const sitemapUrl of sitemapUrls) {
          entries.push(...(await loadSitemap(sitemapUrl, http, state, 1)));
        }
        const uniqueEntries = new Map<string, SitemapEntry>();
        for (const entry of entries) {
          if (!uniqueEntries.has(entry.url)) uniqueEntries.set(entry.url, entry);
        }
        return [...uniqueEntries.values()];
      } catch (error) {
        if (error instanceof SitemapError) throw error;
        if (signal.aborted) throw new SitemapError("The sitemap request timed out");
        if (error instanceof TrustedHttpError) throw new SitemapError(error.message);
        throw new SitemapError("Could not load the sitemap");
      }
    },
  };
}

async function discoverSitemapUrls(website: URL, http: TrustedHttp, state: TraversalState): Promise<readonly string[]> {
  const candidateUrl = new URL("/sitemap.xml", website.origin).toString();
  const candidate = await http.get(candidateUrl, state.policy, {
    signal: state.signal,
    maxBytes: MAX_SITEMAP_BYTES,
  });
  if (candidate.status >= 200 && candidate.status < 300) {
    state.prefetched.set(candidate.url.toString(), candidate);
    return [candidate.url.toString()];
  }
  addResponseToBudget(state, candidate);

  const robotsUrl = new URL("/robots.txt", website.origin).toString();
  const robots = await http.get(robotsUrl, state.policy, {
    signal: state.signal,
    maxBytes: MAX_SITEMAP_BYTES,
  });
  if (robots.status < 200 || robots.status >= 300) throw new SitemapError("Could not find a sitemap for this website");
  addResponseToBudget(state, robots);
  const sitemapUrls = sitemapUrlsFromRobots(new TextDecoder().decode(robots.body), state.policy);
  if (sitemapUrls.length === 0) throw new SitemapError("Could not find a sitemap for this website");
  return sitemapUrls;
}

async function loadSitemap(
  value: string,
  http: TrustedHttp,
  state: TraversalState,
  depth: number,
): Promise<readonly SitemapEntry[]> {
  if (depth > MAX_DEPTH) throw new SitemapError(`Sitemap indexes cannot exceed ${MAX_DEPTH} levels`);
  const url = assertSitemapUrl(value, state.policy, "Sitemap");
  const normalizedUrl = url.toString();
  if (state.visited.has(normalizedUrl)) return [];
  if (state.sitemapCount >= MAX_SITEMAPS) throw new SitemapError(`Sitemap indexes cannot exceed ${MAX_SITEMAPS} files`);
  state.visited.add(normalizedUrl);
  state.sitemapCount++;

  const response =
    state.prefetched.get(normalizedUrl) ??
    (await http.get(normalizedUrl, state.policy, {
      signal: state.signal,
      maxBytes: MAX_SITEMAP_BYTES,
    }));
  state.prefetched.delete(normalizedUrl);
  if (response.status < 200 || response.status >= 300) {
    addResponseToBudget(state, response);
    return [];
  }
  const body = await decodeSitemapBody(response.body, response.url, response.headers);
  addResponseToBudget(state, response, body.byteLength);
  let parsed: ParsedSitemap;
  try {
    parsed = parseSitemapXml(new TextDecoder().decode(body), [...state.policy.origins][0] ?? normalizedUrl);
  } catch (error) {
    if (error instanceof SitemapError && error.message === DOCTYPE_ERROR) return [];
    throw error;
  }

  if (parsed.kind === "entries") {
    state.entryCount += parsed.entries.length;
    if (state.entryCount > MAX_ENTRIES) throw new SitemapError(`Sitemaps cannot exceed ${MAX_ENTRIES} entries`);
    return parsed.entries;
  }

  const entries: SitemapEntry[] = [];
  for (const sitemapUrl of parsed.sitemapUrls) {
    entries.push(...(await loadSitemap(sitemapUrl, http, state, depth + 1)));
  }
  return entries;
}

async function decodeSitemapBody(body: Uint8Array, url: URL, headers: Headers): Promise<Uint8Array> {
  if (!url.pathname.toLowerCase().endsWith(".xml.gz") || headers.has("content-encoding")) return body;
  try {
    const stream = new Blob([new Uint8Array(body)]).stream().pipeThrough(new DecompressionStream("gzip"));
    return readDecompressedBytes(stream);
  } catch (error) {
    if (error instanceof SitemapError) throw error;
    throw new SitemapError("Could not decompress the sitemap");
  }
}

async function readDecompressedBytes(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_SITEMAP_BYTES) {
        await reader.cancel();
        throw new SitemapError(`Decompressed sitemaps cannot exceed ${MAX_SITEMAP_BYTES / 1024 / 1024} MB`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function addToBudget(state: TraversalState, bytes: number): void {
  state.totalBytes += bytes;
  if (state.totalBytes > MAX_TOTAL_BYTES) throw new SitemapError("Sitemaps cannot exceed 5 MB in total");
}

function addResponseToBudget(
  state: TraversalState,
  response: TrustedResponse,
  decodedBytes = response.body.byteLength,
): void {
  const transferredBytes = response.transferredBytes ?? response.body.byteLength;
  const isCompressed = response.headers.has("content-encoding") || decodedBytes !== response.body.byteLength;
  addToBudget(state, isCompressed ? transferredBytes + decodedBytes : Math.max(transferredBytes, decodedBytes));
}

export const sitemapLoader = createSitemapLoader(trustedHttp);
