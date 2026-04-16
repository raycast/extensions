import { parse } from "node-html-parser";
import type { SearchResult } from "./types";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";

const ACCEPT_HTML =
  "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";

function stripHtml(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function searchViaDDG(
  query: string,
  max: number,
): Promise<SearchResult[]> {
  const body = new URLSearchParams({ q: query, b: "", kl: "wt-wt" });

  const res = await fetch("https://html.duckduckgo.com/html/", {
    method: "POST",
    headers: {
      "User-Agent": UA,
      Accept: ACCEPT_HTML,
      "Accept-Language": "en-US,en;q=0.5",
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: "https://html.duckduckgo.com/html/",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-User": "?1",
    },
    body: body.toString(),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) throw new Error(`DDG HTTP ${res.status}`);

  const root = parse(await res.text());

  if (root.querySelector("form#challenge-form")) {
    throw new Error("DDG blocked: bot challenge page returned");
  }

  const nodes = root.querySelectorAll(".result.web-result");
  if (nodes.length === 0) throw new Error("DDG: 0 result nodes");

  const results: SearchResult[] = [];
  for (const node of nodes) {
    if (results.length >= max) break;
    const titleNode = node.querySelector(".result__a");
    if (!titleNode) continue;
    const title = stripHtml(titleNode.innerHTML);
    const rawHref = titleNode.getAttribute("href") ?? "";
    const url = decodeDDGUrl(rawHref);
    const snippet = stripHtml(
      node.querySelector(".result__snippet")?.innerHTML ?? "",
    );
    if (title && url.startsWith("http"))
      results.push({ title, url, snippet, engine: "DuckDuckGo" });
  }

  if (results.length === 0) throw new Error("DDG: parsed 0 valid results");
  return results;
}

function decodeDDGUrl(raw: string): string {
  try {
    const normalized = raw.startsWith("//") ? `https:${raw}` : raw;
    const uddg = new URL(normalized).searchParams.get("uddg");
    if (uddg) return decodeURIComponent(uddg);
  } catch {
    // raw is already a direct URL
  }
  return raw;
}

export async function searchViaBing(
  query: string,
  max: number,
): Promise<SearchResult[]> {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=${max}&mkt=en-US&setlang=en&cc=US`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: ACCEPT_HTML,
      "Accept-Language": "en-US,en;q=0.9",
      Cookie: "SRCHLANG=en; _EDGE_S=mkt=en-US",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) throw new Error(`Bing HTTP ${res.status}`);

  const root = parse(await res.text());
  const nodes = root.querySelectorAll("li.b_algo");
  if (nodes.length === 0) throw new Error("Bing: 0 result nodes");

  const results: SearchResult[] = [];
  for (const node of nodes) {
    if (results.length >= max) break;
    const titleNode = node.querySelector("h2 a");
    const citeNode = node.querySelector("cite");
    if (!titleNode || !citeNode) continue;

    const title = stripHtml(titleNode.innerHTML);
    const rawCite = citeNode.text.trim().replace(/\s+/g, "").replace(/›/g, "/");
    const itemUrl = rawCite.startsWith("http") ? rawCite : `https://${rawCite}`;
    const snippet = stripHtml(
      (node.querySelector(".b_caption p") ?? node.querySelector("p.b_algoSlug"))
        ?.innerHTML ?? "",
    );

    if (title && itemUrl.startsWith("http"))
      results.push({ title, url: itemUrl, snippet, engine: "Bing" });
  }

  if (results.length === 0) throw new Error("Bing: parsed 0 valid results");

  const queryTokens = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 4);
  const isRelevant =
    queryTokens.length === 0 ||
    results.some((r) => {
      const hay = `${r.title} ${r.url} ${r.snippet}`.toLowerCase();
      return queryTokens.some((t) => hay.includes(t));
    });
  if (!isRelevant)
    throw new Error(
      "Bing: results appear geo-misrouted (no query tokens found in any result)",
    );

  return results;
}

export async function searchViaStartpage(
  query: string,
  max: number,
): Promise<SearchResult[]> {
  const url = `https://www.startpage.com/search?q=${encodeURIComponent(query)}&cat=web&language=english`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: ACCEPT_HTML,
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) throw new Error(`Startpage HTTP ${res.status}`);

  const root = parse(await res.text());
  const blocks = root.querySelectorAll(".result");
  if (blocks.length === 0) throw new Error("Startpage: 0 result blocks");

  const results: SearchResult[] = [];
  for (const block of blocks) {
    if (results.length >= max) break;

    const titleEl = block.querySelector("h2.wgl-title");
    const linkEl =
      block.querySelector("a.wgl-site-title") ??
      block.querySelector("a.result-title");
    if (!titleEl || !linkEl) continue;

    const itemUrl = linkEl.getAttribute("href") ?? "";
    if (!itemUrl.startsWith("http") || itemUrl.includes("startpage.com"))
      continue;

    const title = stripHtml(titleEl.innerHTML);
    if (!title) continue;

    const snippet = stripHtml(
      block.querySelector("p.description")?.innerHTML ?? "",
    );
    results.push({ title, url: itemUrl, snippet, engine: "Startpage" });
  }

  if (results.length === 0)
    throw new Error("Startpage: parsed 0 valid results");
  return results;
}

export async function searchDuckDuckGo(
  query: string,
  maxResults = 10,
): Promise<SearchResult[]> {
  const engines: Array<() => Promise<SearchResult[]>> = [
    () => searchViaStartpage(query, maxResults * 2),
    () => searchViaDDG(query, maxResults * 2),
    () => searchViaBing(query, maxResults * 2),
  ];

  const collected: SearchResult[] = [];
  const errors: string[] = [];

  for (const fn of engines) {
    if (deduplicateByHostname(collected, maxResults).length >= maxResults)
      break;
    try {
      const raw = await fn();
      collected.push(...raw);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  const deduped = deduplicateByHostname(collected, maxResults);
  if (deduped.length > 0) return deduped;

  throw new Error(`All search engines failed:\n${errors.join("\n")}`);
}

function deduplicateByHostname(
  results: SearchResult[],
  max: number,
): SearchResult[] {
  const seen = new Set<string>();
  const out: SearchResult[] = [];
  for (const r of results) {
    let hostname: string;
    try {
      hostname = new URL(r.url).hostname.replace(/^www\./, "");
    } catch {
      continue;
    }
    if (seen.has(hostname)) continue;
    seen.add(hostname);
    out.push(r);
    if (out.length >= max) break;
  }
  return out;
}
