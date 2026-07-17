import { parse as parseHTML } from "node-html-parser";
import google from "googlethis";
import { Cache } from "@raycast/api";

// ─── Types ───────────────────────────────────────────────────────────

export interface SearchResult {
  readonly title: string;
  readonly url: string;
  readonly snippet: string;
}

interface SearXNGResult {
  readonly title?: string;
  readonly url?: string;
  readonly content?: string;
}

interface SearXNGResponse {
  readonly results?: readonly SearXNGResult[];
}

// ─── Constants ───────────────────────────────────────────────────────

const SEARCH_TIMEOUT_MS = 15000;
const DDG_URL = "https://html.duckduckgo.com/html/";
const DDG_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ─── Public API ──────────────────────────────────────────────────────

export async function searchWeb(
  query: string,
  searxngUrl: string,
  maxResults: number,
  parentSignal?: AbortSignal,
): Promise<readonly SearchResult[]> {
  const cache = new Cache();
  const cacheKey = `search_${encodeURIComponent(query)}`;

  // Tier 1: Fresh Cache
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    try {
      const parsed = JSON.parse(cachedData);
      if (Date.now() - parsed.timestamp < 60 * 60 * 1000) {
        // 1 hour TTL
        console.log("Tier 1: Fresh Cache Hit");
        return parsed.results.slice(0, maxResults);
      }
    } catch (e) {
      // Ignore cache parse error
    }
  }

  const controller = new AbortController();
  const signal = controller.signal;

  let parentAbortHandler: (() => void) | undefined;
  if (parentSignal) {
    if (parentSignal.aborted) throw new Error("Aborted");
    parentAbortHandler = () => controller.abort();
    parentSignal.addEventListener("abort", parentAbortHandler);
  }

  const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

  try {
    console.log("🏎️ Starting search race...");
    const promises = [];

    // The Racers (Wrap in strict length checks to only accept valid wins)
    promises.push(
      searchBrave(query, signal).then((r) => {
        if (r.length === 0) throw new Error("Brave empty");
        console.log("🏁 Brave Search won the race!");
        return r;
      }),
    );

    promises.push(
      searchGoogle(query, signal).then((r) => {
        if (r.length === 0) throw new Error("Google empty");
        console.log("🏁 Google Search won the race!");
        return r;
      }),
    );

    promises.push(
      searchDuckDuckGo(query, signal).then((r) => {
        if (r.length === 0) throw new Error("DDG empty");
        console.log("🏁 DuckDuckGo won the race!");
        return r;
      }),
    );

    if (searxngUrl) {
      promises.push(
        searchSearXNG(query, searxngUrl, signal).then((r) => {
          if (r.length === 0) throw new Error("SearXNG empty");
          console.log("🏁 SearXNG won the race!");
          return r;
        }),
      );
    }

    // Wait for the FIRST successful response
    const fastestResults = await Promise.any(promises);

    // THE KILL SWITCH: Instantly abort all losing engines to prevent JS Memory Overflow
    console.log(
      "🛑 Race finished! Revoking losing network requests to free memory.",
    );
    controller.abort();

    // Save to cache before returning
    cache.set(
      cacheKey,
      JSON.stringify({
        timestamp: Date.now(),
        results: fastestResults,
      }),
    );

    return fastestResults.slice(0, maxResults);
  } catch (finalError) {
    // Tier 5: Stale Cache
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        console.log("Tier 5: Stale Cache Fallback");
        return parsed.results.slice(0, maxResults).map((r: SearchResult) => ({
          ...r,
          title: `[STALE] ${r.title}`,
        }));
      } catch (e) {
        // ignore parsing error
      }
    }

    // Tier 6: Emergency Static Fallback
    console.log("Tier 6: Emergency Fallback");
    return [
      {
        title: "Emergency Fallback: Search Unavailable",
        url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`,
        snippet:
          "The live web search is currently unreachable. Click this link to search Wikipedia directly as a fallback.",
      },
    ];
  } finally {
    clearTimeout(timeoutId);
    controller.abort();
    if (parentSignal && parentAbortHandler) {
      parentSignal.removeEventListener("abort", parentAbortHandler);
    }
  }
}

// ─── SearXNG ─────────────────────────────────────────────────────────

export async function searchSearXNG(
  query: string,
  baseUrl: string,
  signal?: AbortSignal,
): Promise<readonly SearchResult[]> {
  const encodedQuery = encodeURIComponent(query);
  const url = `${baseUrl}/search?q=${encodedQuery}&format=json`;

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(`SearXNG responded with status ${response.status}`);
  }

  const data = (await response.json()) as SearXNGResponse;
  const rawResults = data.results ?? [];

  return rawResults.filter(isValidSearXNGResult).map(mapSearXNGResult);
}

function isValidSearXNGResult(result: SearXNGResult): boolean {
  return Boolean(result.title && result.url);
}

function mapSearXNGResult(result: SearXNGResult): SearchResult {
  return {
    title: (result.title ?? "").trim(),
    url: (result.url ?? "").trim(),
    snippet: (result.content ?? "").trim(),
  };
}

// ─── DuckDuckGo HTML Fallback ────────────────────────────────────────

export async function searchDuckDuckGo(
  query: string,
  signal?: AbortSignal,
): Promise<readonly SearchResult[]> {
  const formBody = `q=${encodeURIComponent(query)}`;

  const response = await fetch(DDG_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": DDG_USER_AGENT,
    },
    body: formBody,
    signal,
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo responded with status ${response.status}`);
  }

  const html = await response.text();
  return parseDuckDuckGoResults(html);
}

function parseDuckDuckGoResults(html: string): readonly SearchResult[] {
  const root = parseHTML(html);
  const resultElements = root.querySelectorAll(".result");

  const results: SearchResult[] = [];

  for (const element of resultElements) {
    const parsed = parseSingleDDGResult(element);
    if (parsed) {
      results.push(parsed);
    }
  }

  return results;
}

function parseSingleDDGResult(
  element: ReturnType<ReturnType<typeof parseHTML>["querySelector"]>,
): SearchResult | null {
  if (!element) return null;

  const linkElement = element.querySelector(".result__a");
  const snippetElement = element.querySelector(".result__snippet");

  if (!linkElement) return null;

  const title = linkElement.textContent.trim();
  const rawHref = linkElement.getAttribute("href") ?? "";
  const url = extractDDGUrl(rawHref);
  const snippet = snippetElement?.textContent.trim() ?? "";

  if (!title || !url) return null;

  return { title, url, snippet };
}

function extractDDGUrl(rawHref: string): string {
  // DDG wraps URLs in a redirect: //duckduckgo.com/l/?uddg=ENCODED_URL&...
  try {
    if (rawHref.includes("uddg=")) {
      const urlObj = new URL(rawHref, "https://duckduckgo.com");
      const decoded = urlObj.searchParams.get("uddg");
      return decoded ?? rawHref;
    }
    // Direct URL
    if (rawHref.startsWith("http")) {
      return rawHref;
    }
    return rawHref;
  } catch {
    return rawHref;
  }
}

// ─── Google (googlethis) ─────────────────────────────────────────────

export async function searchGoogle(
  query: string,
  signal?: AbortSignal,
): Promise<readonly SearchResult[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options: any = {
    page: 0,
    safe: false,
    additional_params: {
      hl: "en",
    },
    axios_config: {
      signal,
    },
  };

  try {
    const response = await google.search(query, options);

    if (!response || !response.results) {
      return [];
    }

    return response.results.map((r) => ({
      title: (r.title ?? "").trim(),
      url: (r.url ?? "").trim(),
      snippet: (r.description ?? "").trim(),
    }));
  } catch (error) {
    throw new Error(`Google Search failed: ${error}`);
  }
}

// ─── Brave Search ────────────────────────────────────────────────────

export async function searchBrave(
  query: string,
  signal?: AbortSignal,
): Promise<readonly SearchResult[]> {
  try {
    const res = await fetch(
      `https://search.brave.com/search?q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
        signal,
      },
    );

    if (!res.ok) {
      throw new Error(`Brave Search responded with status ${res.status}`);
    }

    const html = await res.text();
    const root = parseHTML(html);
    const resultElements = root.querySelectorAll('.snippet, [data-type="web"]');

    const results: SearchResult[] = [];
    for (const el of resultElements) {
      const a = el.querySelector("a");
      const title =
        a?.querySelector(".title")?.textContent?.trim() ||
        a?.textContent?.trim();
      const url = a?.getAttribute("href");
      const snippet = el
        .querySelector(".snippet-content, .snippet-description, .heading + div")
        ?.textContent?.trim();

      if (title && url && url.startsWith("http")) {
        results.push({ title, url, snippet: snippet ?? "" });
      }
    }

    return results;
  } catch (error) {
    throw new Error(`Brave Search failed: ${error}`);
  }
}
