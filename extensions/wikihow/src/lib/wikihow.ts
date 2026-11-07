export const SEARCH_ENDPOINT = "https://api.search.brave.com/res/v1/web/search";
export const MAX_PAGE = 9;

export interface WikiHowArticle {
  title: string;
  url: string;
  excerpt: string;
  extraExcerpts: string[];
}

export interface ArticlePage {
  articles: WikiHowArticle[];
  hasMore: boolean;
  page: number;
}

export class WikiHowSearchError extends Error {
  constructor(
    message: string,
    public readonly code: "missing-key" | "input" | "auth" | "rate-limit" | "network" | "response",
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "WikiHowSearchError";
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  bull: "•",
  copy: "©",
  reg: "®",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, name: string) => {
    if (!name.startsWith("#")) return ENTITIES[name] ?? entity;
    const code = name[1].toLowerCase() === "x" ? parseInt(name.slice(2), 16) : Number(name.slice(1));
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : "�";
  });
}

export function plainText(value: unknown): string {
  if (typeof value !== "string") return "";
  return decodeEntities(value.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/** Accept only English wikiHow article URLs, never arbitrary search-result destinations. */
export function articleUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !["www.wikihow.com", "wikihow.com"].includes(url.hostname) ||
      url.username ||
      url.password ||
      url.port
    ) {
      return undefined;
    }
    const slug = decodeURIComponent(url.pathname.slice(1));
    if (
      !slug ||
      slug.includes("/") ||
      slug.includes(":") ||
      Array.from(slug).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) ||
      /\.(php|xml|json|txt|html?)$/i.test(slug) ||
      /^(Main-Page|Terms-of-Use|Privacy-Policy|About-wikiHow)$/i.test(slug)
    ) {
      return undefined;
    }
    url.hostname = "www.wikihow.com";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}

export function parseSearchResponse(value: unknown, page: number): ArticlePage {
  if (!record(value) || value.type !== "search") {
    throw new WikiHowSearchError("Brave returned an unexpected response. Please try again later.", "response");
  }
  if (value.web !== undefined && value.web !== null && (!record(value.web) || !Array.isArray(value.web.results))) {
    throw new WikiHowSearchError("Brave returned an unexpected results format. Please try again later.", "response");
  }
  const results = record(value.web) && Array.isArray(value.web.results) ? value.web.results : [];
  const seen = new Set<string>();
  const articles: WikiHowArticle[] = [];
  for (const result of results) {
    if (!record(result)) continue;
    const url = articleUrl(result.url);
    const title = plainText(result.title);
    if (!url || !title || seen.has(url)) continue;
    seen.add(url);
    const excerpt = plainText(result.description);
    const extraExcerpts = Array.isArray(result.extra_snippets)
      ? Array.from(new Set(result.extra_snippets.map(plainText)))
          .filter((text) => text && text !== excerpt)
          .slice(0, 5)
      : [];
    articles.push({ title, url, excerpt, extraExcerpts });
  }
  return {
    articles,
    hasMore: page < MAX_PAGE && record(value.query) && value.query.more_results_available === true,
    page,
  };
}

export function buildSearchUrl(query: string, page: number): URL {
  const trimmed = query.trim();
  const scopedQuery = `site:www.wikihow.com ${trimmed}`;
  if (!trimmed || scopedQuery.length > 600 || scopedQuery.split(/\s+/).length > 75) {
    throw new WikiHowSearchError("Use a search query of up to 579 characters and 74 words.", "input");
  }
  if (!Number.isInteger(page) || page < 0 || page > MAX_PAGE) {
    throw new WikiHowSearchError("The requested results page is outside Brave’s supported range.", "input");
  }
  const url = new URL(SEARCH_ENDPOINT);
  url.searchParams.set("q", scopedQuery);
  url.searchParams.set("count", "20");
  url.searchParams.set("offset", String(page));
  url.searchParams.set("search_lang", "en");
  url.searchParams.set("safesearch", "moderate");
  url.searchParams.set("extra_snippets", "true");
  url.searchParams.set("text_decorations", "false");
  url.searchParams.set("result_filter", "web");
  return url;
}

function retryDelay(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  const delay = Number.isFinite(seconds) ? seconds : Math.ceil((Date.parse(value) - Date.now()) / 1000);
  return Number.isFinite(delay) && delay >= 0 ? Math.max(1, Math.ceil(delay)) : undefined;
}

export async function searchArticles(
  query: string,
  page: number,
  apiKey: string,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<ArticlePage> {
  if (!apiKey.trim()) {
    throw new WikiHowSearchError(
      "Add your Brave Search API key in the extension preferences to search articles.",
      "missing-key",
    );
  }
  const url = buildSearchUrl(query, page);
  const timeout = AbortSignal.timeout(15_000);
  let response: Response;
  try {
    response = await fetcher(url, {
      headers: { Accept: "application/json", "X-Subscription-Token": apiKey.trim() },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      redirect: "error",
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new WikiHowSearchError(
      timeout.aborted
        ? "The search timed out. Please try again."
        : "Could not reach Brave Search. Check your connection and try again.",
      "network",
    );
  }
  if (response.status === 401 || response.status === 403) {
    throw new WikiHowSearchError(
      "Brave rejected your API key. Check the key and Web Search access in your Brave API dashboard.",
      "auth",
    );
  }
  if (response.status === 429) {
    const seconds = retryDelay(response.headers.get("retry-after"));
    throw new WikiHowSearchError(
      seconds
        ? `Brave’s rate limit was reached. Try again in ${seconds} seconds.`
        : "Brave’s rate limit or API allowance was reached. Check your dashboard before retrying.",
      "rate-limit",
      seconds,
    );
  }
  if (!response.ok) {
    throw new WikiHowSearchError(
      response.status === 422
        ? "Brave rejected this search request. Check your key and try a shorter query."
        : `Brave Search is unavailable (HTTP ${response.status}). Please try again later.`,
      "response",
    );
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new WikiHowSearchError("Brave returned an unreadable response. Please try again later.", "response");
  }
  return parseSearchResponse(body, page);
}

function markdownText(text: string): string {
  return text.replace(/[\\`*_{}[\]()#+.!|<>~-]/g, "\\$&");
}

export function articleMarkdown(article: WikiHowArticle): string {
  const excerpts = [article.excerpt, ...article.extraExcerpts].filter(Boolean);
  return [
    `# ${markdownText(article.title)}`,
    "*Search excerpts, not the full article. Open on wikiHow for all steps and illustrations.*",
    excerpts.length
      ? excerpts.map(markdownText).join("\n\n---\n\n")
      : "No search excerpt is available for this article.",
    `[Read the full article on wikiHow](${article.url})`,
  ].join("\n\n");
}
