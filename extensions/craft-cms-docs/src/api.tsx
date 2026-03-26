import type { CoreData, DocsLink, DocsSearchResult, GlossaryTerm, PluginStoreResponse, RelatedTerm } from "./types";

const BASE = "https://craftcms.com/api/glossary";
const DOCS_SEARCH_BASE = "https://craftcms.com/api/docs/search";
const PLUGIN_STORE_BASE = "https://api.craftcms.com/v1/plugin-store";
const DEFAULT_TIMEOUT = 8000;

export async function fetchPluginStorePage(
  page: number,
  perPage = 96,
  options?: { signal?: AbortSignal },
): Promise<PluginStoreResponse> {
  const params = new URLSearchParams({ page: String(page), perPage: String(perPage), orderBy: "popularity" });
  const res = await fetch(`${PLUGIN_STORE_BASE}/plugins?${params}`, {
    headers: { Accept: "application/json" },
    signal: options?.signal,
  });
  if (!res.ok) throw new Error(`Plugin store fetch failed: ${res.status}`);
  return res.json() as Promise<PluginStoreResponse>;
}

export async function fetchCoreData(options?: { signal?: AbortSignal }): Promise<CoreData> {
  const res = await fetch(`${PLUGIN_STORE_BASE}/core-data`, {
    headers: { Accept: "application/json" },
    signal: options?.signal,
  });
  if (!res.ok) throw new Error(`Core data fetch failed: ${res.status}`);
  return res.json() as Promise<CoreData>;
}

export async function searchGlossary(
  query: string,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<GlossaryTerm[]> {
  const u = query.trim() ? `${BASE}?query=${encodeURIComponent(query)}` : BASE;

  const res = await fetchWithTimeout(
    u,
    {
      headers: { Accept: "application/json" },
      method: "GET",
      signal: options?.signal,
    },
    options?.timeoutMs ?? DEFAULT_TIMEOUT,
  );

  if (!res.ok) throw new Error(`Glossary search failed: ${res.status}`);
  const data = (await res.json()) as unknown;
  return Array.isArray(data) ? (data as GlossaryTerm[]) : [];
}

export async function searchDocs(
  query: string,
  options?: { signal?: AbortSignal; timeoutMs?: number; version?: string; scopes?: string[] },
): Promise<DocsSearchResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const params = new URLSearchParams({ query: trimmedQuery });
  if (options?.version) {
    params.set("version", options.version);
  }
  for (const scope of options?.scopes ?? []) {
    params.append("scopes[]", scope);
  }
  const url = `${DOCS_SEARCH_BASE}?${params.toString()}`;
  const res = await fetchWithTimeout(
    url,
    {
      headers: { Accept: "application/json" },
      method: "GET",
      signal: options?.signal,
    },
    options?.timeoutMs ?? DEFAULT_TIMEOUT,
  );

  if (!res.ok) throw new Error(`Docs search failed: ${res.status}`);
  const data = (await res.json()) as unknown;
  return normalizeDocsResults(data);
}

export function deriveDocsCategoryFromUrl(url: string): string | undefined {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return undefined;
  }

  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment).replace(/\.html$/i, ""));

  if (segments[0] !== "docs") return undefined;

  let docsSegments = segments.slice(1);
  if (docsSegments[0] === "commerce" || docsSegments[0] === "cloud") {
    docsSegments = docsSegments.slice(1);
  }

  if (docsSegments.length === 0) return undefined;
  if (/^[1-5]\.x$/i.test(docsSegments[0])) {
    docsSegments = docsSegments.slice(1);
  }

  if (docsSegments.length === 1) return "Getting Started";
  if (docsSegments.length === 0) return undefined;

  return docsSegments.slice(0, -1).map(formatCategorySegment).join(" -> ");
}

async function fetchWithTimeout(input: string | URL, init: RequestInit = {}, timeoutMs: number) {
  if (!timeoutMs || timeoutMs <= 0) return fetch(input, init);

  const controller = new AbortController();
  const signal = mergeSignals(init.signal, controller.signal);
  const timer = setTimeout(() => controller.abort(new Error("Request timed out")), timeoutMs);

  try {
    return await fetch(input, { ...init, signal });
  } finally {
    clearTimeout(timer);
  }
}

function mergeSignals(a?: AbortSignal | null, b?: AbortSignal): AbortSignal | undefined {
  if (!a) return b;
  if (!b) return a;

  const controller = new AbortController();

  const onAbortA = () => controller.abort(a.reason);
  const onAbortB = () => controller.abort(b.reason);

  if (a.aborted) controller.abort(a.reason);
  else if (b.aborted) controller.abort(b.reason);
  else {
    a.addEventListener("abort", onAbortA);
    b.addEventListener("abort", onAbortB);
    controller.signal.addEventListener(
      "abort",
      () => {
        a.removeEventListener("abort", onAbortA);
        b.removeEventListener("abort", onAbortB);
      },
      { once: true },
    );
  }
  return controller.signal;
}

function normalizeDocsResults(payload: unknown): DocsSearchResult[] {
  const rows = getResultRows(payload);
  const out: DocsSearchResult[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const type = firstString(row.type);
    const title =
      firstString(row.title, row.name, row.headline, getNestedString(row, ["hierarchy", "lvl0"])) ?? "Untitled";
    const url = normalizeUrl(
      firstString(row.url, row.href, row.permalink, row.path, row.uri) ?? getNestedString(row, ["link", "url"]),
    );
    if (!url) continue;

    const summaryPlain = firstString(
      row.summaryPlain,
      row.summary_plain,
      row.description,
      row.excerpt,
      row.summary,
      row.text,
      row.snippet,
      row.content,
      getNestedString(row, ["hierarchy", "lvl2"]),
    );
    const summaryHtml = firstString(row.summaryHtml, row.summary_html, row.html, row.bodyHtml, row.body_html);
    const slug = firstString(row.slug) ?? extractGlossarySlug(url);
    const section = firstString(
      row.section,
      row.category,
      getNestedString(row, ["hierarchy", "lvl1"]),
      getNestedString(row, ["hierarchy", "lvl0"]),
    );
    const { docsLinks, relatedTerms } = splitAssociatedLinks(extractLinkCandidates(row));
    const key = `${title}|${url}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      id: key,
      title: title.trim(),
      url,
      slug,
      summaryPlain: summaryPlain?.trim(),
      summaryHtml,
      section: section?.trim(),
      category: deriveDocsCategoryFromUrl(url),
      type: type?.trim(),
      docsLinks,
      relatedTerms,
      craftVersion: inferCraftVersion(url, type),
    });
  }

  return out;
}

function getResultRows(payload: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }
  if (!isRecord(payload)) return [];

  const roots = [payload.results, payload.items, payload.hits, payload.documents, payload.data, payload.matches];

  for (const root of roots) {
    if (Array.isArray(root)) return root.filter(isRecord);
  }

  if (isRecord(payload.data)) {
    const nested = [payload.data.results, payload.data.items, payload.data.hits];
    for (const row of nested) {
      if (Array.isArray(row)) return row.filter(isRecord);
    }
  }

  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeUrl(value?: string): string | undefined {
  if (!value) return undefined;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return `https://craftcms.com${value}`;
  return `https://craftcms.com/${value.replace(/^\/+/, "")}`;
}

function getNestedString(row: Record<string, unknown>, keys: string[]): string | undefined {
  let current: unknown = row;
  for (const key of keys) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return typeof current === "string" ? current : undefined;
}

function firstString(...values: Array<unknown>): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function inferCraftVersion(url: string, type?: string): DocsSearchResult["craftVersion"] | undefined {
  const urlMatch = url.toLowerCase().match(/(?:^|\/)([1-5])\.x(?:\/|$)/);
  if (urlMatch && isVersionNumber(urlMatch[1])) return `${urlMatch[1]}.x`;

  if (!type) return undefined;
  const typeMatch = type.toLowerCase().match(/(?:craft[\s-]*)?([1-5])(?:\b|\.|x)/);
  if (typeMatch && isVersionNumber(typeMatch[1])) return `${typeMatch[1]}.x`;
  return undefined;
}

function isVersionNumber(value: string): value is "1" | "2" | "3" | "4" | "5" {
  return value === "1" || value === "2" || value === "3" || value === "4" || value === "5";
}

function extractGlossarySlug(url: string): string | undefined {
  const match = url.toLowerCase().match(/\/glossary\/([a-z0-9-]+)(?:\/|$|[?#])/);
  return match?.[1];
}

function formatCategorySegment(segment: string): string {
  const withSpaces = segment
    .replace(/[-_]+/g, " ")
    .replace(/\band\b/gi, "and")
    .trim();

  if (!withSpaces) return segment;

  return withSpaces
    .split(/\s+/)
    .map((word) => {
      if (word.toUpperCase() === "API") return "API";
      if (word.toUpperCase() === "CMS") return "CMS";
      if (word.toUpperCase() === "DB") return "DB";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function extractLinkCandidates(row: Record<string, unknown>): DocsLink[] | undefined {
  const candidates = [row.docsLinks, row.docs_links, row.relatedDocs, row.related_docs];
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    const links = candidate
      .map((item) => {
        if (!isRecord(item)) return null;
        const title = firstString(item.title, item.name, item.label);
        const url = normalizeUrl(firstString(item.url, item.href, item.path, item.uri));
        if (!title || !url) return null;
        return { title: title.trim(), url };
      })
      .filter((item): item is { title: string; url: string } => item !== null);
    if (links.length > 0) return links;
  }
  return undefined;
}

export function splitAssociatedLinks(links?: DocsLink[]): {
  docsLinks?: DocsLink[];
  relatedTerms?: RelatedTerm[];
} {
  if (!links?.length) return {};

  const docsLinks: DocsLink[] = [];
  const relatedTerms: RelatedTerm[] = [];
  const seenDocs = new Set<string>();
  const seenTerms = new Set<string>();

  for (const link of links) {
    const slug = extractGlossarySlug(link.url);
    if (slug) {
      const key = slug.toLowerCase();
      if (seenTerms.has(key)) continue;
      seenTerms.add(key);
      relatedTerms.push({ title: link.title, slug, url: link.url });
      continue;
    }

    const key = `${link.title}|${link.url}`;
    if (seenDocs.has(key)) continue;
    seenDocs.add(key);
    docsLinks.push(link);
  }

  return {
    docsLinks: docsLinks.length > 0 ? docsLinks : undefined,
    relatedTerms: relatedTerms.length > 0 ? relatedTerms : undefined,
  };
}

export function extractRelatedTermsFromHtml(html?: string): RelatedTerm[] | undefined {
  if (!html) return undefined;

  const relatedTerms: RelatedTerm[] = [];
  const seenTerms = new Set<string>();
  const pattern =
    /<a\b[^>]*\bhref\s*=\s*"(?:https?:\/\/(?:www\.)?craftcms\.com)?\/glossary\/([A-Za-z0-9-]+)\/?"[^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(pattern)) {
    const slug = match[1]?.trim();
    if (!slug) continue;

    const key = slug.toLowerCase();
    if (seenTerms.has(key)) continue;
    seenTerms.add(key);

    const title = firstString(stripTags(match[2])) ?? slug;
    relatedTerms.push({
      title: title.trim(),
      slug,
      url: `https://craftcms.com/glossary/${slug}`,
    });
  }

  return relatedTerms.length > 0 ? relatedTerms : undefined;
}

function stripTags(input: string | undefined): string | undefined {
  if (!input) return undefined;
  return input
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
