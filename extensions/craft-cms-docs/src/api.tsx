import type { DocsSearchResult, GlossaryTerm } from "./types";

const BASE = "https://craftcms.com/api/glossary";
const DOCS_SEARCH_BASE = "https://craftcms.com/api/docs/search";
const DEFAULT_TIMEOUT = 8000;

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
    const docsLinks = extractDocsLinks(row);
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
      type: type?.trim(),
      docsLinks,
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
  return typeof value === "object" && value !== null;
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

function extractDocsLinks(row: Record<string, unknown>): DocsSearchResult["docsLinks"] | undefined {
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
