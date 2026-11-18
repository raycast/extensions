import { Article } from "./type";

const BASE_URL = "https://www.publico.pt/api";
const REQUEST_TIMEOUT_MS = 10_000;

// Público's WAF challenges non-browser HTML requests; sending a browser-like
// User-Agent keeps the JSON API routes reliable if that policy ever tightens.
const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "application/json",
};

// --- Response validation ---

function isArticleLike(item: unknown): item is Article {
  if (!item || typeof item !== "object") {
    return false;
  }
  const obj = item as Record<string, unknown>;
  return typeof obj.titulo === "string" && typeof obj.url === "string";
}

function validateArticleArray(data: unknown): Article[] {
  if (!Array.isArray(data)) {
    return [];
  }
  return data.filter(isArticleLike);
}

function validateArticle(data: unknown): Article | null {
  return isArticleLike(data) ? data : null;
}

// --- Error classification ---

export function classifyError(error: unknown, context: string): Error {
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return error;
    }
    if (error.name === "TimeoutError") {
      return new Error(
        `${context}: the request took too long. Please try again.`,
      );
    }
    // Network errors (DNS failure, connection refused, etc.) surface as
    // TypeError from fetch. Keep the original as `cause`: a programming
    // TypeError would otherwise be reported to the user as a network problem
    // with its real message discarded.
    if (error instanceof TypeError) {
      return new Error(
        `${context}: could not connect. Please check your internet connection.`,
        { cause: error },
      );
    }
    return error;
  }
  return new Error(`${context}: ${String(error)}`);
}

// --- Shared fetch helpers ---

export async function fetchArticleList(
  url: string,
  context: string,
): Promise<Article[]> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: REQUEST_HEADERS,
    });

    if (!response.ok) {
      throw new Error(
        `${context}: HTTP ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return validateArticleArray(data);
  } catch (error) {
    throw classifyError(error, context);
  }
}

// --- Public API ---

export async function fetchLatestHeadlines(): Promise<Article[]> {
  return fetchArticleList(
    `${BASE_URL}/list/ultimas`,
    "Unable to load latest headlines",
  );
}

export async function fetchTopNews(): Promise<Article[]> {
  return fetchArticleList(
    `${BASE_URL}/list/destaque`,
    "Unable to load popular news",
  );
}

/**
 * Fetch a section feed by slug (e.g. "politica", "desporto").
 * Returns up to ~10 of the latest articles. The API caps every list here.
 */
export async function fetchSection(slug: string): Promise<Article[]> {
  return fetchArticleList(
    `${BASE_URL}/list/${encodeURIComponent(slug)}`,
    `Unable to load ${slug}`,
  );
}

// --- Tag-based search ---
//
// Público's `/pesquisa` HTML search is WAF-blocked and the JSON search endpoint
// ignores its query. But `/api/list/{slug}` accepts TAG slugs, not just
// sections: slugify the query and it returns topic-filtered articles. Unknown
// slugs return an empty array, which we use as the no-results signal.
// See docs/endpoints.md for the full investigation.

// prettier-ignore
const PT_STOPWORDS = new Set([
  "a", "o", "as", "os", "um", "uma", "de", "da", "do", "das", "dos",
  "e", "em", "na", "no", "nas", "nos", "ao", "aos", "com", "para",
  "por", "que", "se", "ou",
]);

/** Lowercase, strip accents, collapse non-alphanumerics into hyphens. */
export function slugify(query: string): string {
  return query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Ordered slug candidates to try for a query, widening recall:
 * 1. the full slugified query,
 * 2. the query with Portuguese stopwords removed (e.g. "guerra na ucr\u00e2nia"
 *    also tries "guerra-ucrania").
 */
export function slugCandidates(query: string): string[] {
  const words = query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  const significant = words.filter((word) => !PT_STOPWORDS.has(word));
  const candidates = [words.join("-")];

  if (significant.length && significant.length !== words.length) {
    candidates.push(significant.join("-"));
  }

  return [...new Set(candidates)].filter(Boolean);
}

export async function searchArticlesByTag(query: string): Promise<Article[]> {
  if (!query.trim()) {
    return [];
  }

  const context = "Unable to search articles";
  for (const slug of slugCandidates(query)) {
    const results = await fetchArticleList(`${BASE_URL}/list/${slug}`, context);
    if (results.length > 0) {
      return results;
    }
  }

  return [];
}

/**
 * The article id, taken from the payload rather than parsed out of the URL.
 *
 * A previous implementation matched the URL against four regex patterns. Video,
 * multimedia and podcast URLs end in `-YYYYMMDD-HHMMSS`, so the 6+ digit
 * fallback matched the time component and returned a valid but unrelated
 * article id, and ids under six digits matched nothing at all. `id` is present
 * on every item the API returns.
 */
export function getArticleId(article: Article): string | null {
  return article?.id ? String(article.id) : null;
}

// Fetch article detail by ID
export async function fetchArticleDetail(
  articleId: string,
  signal?: AbortSignal,
): Promise<Article | null> {
  const context = "Unable to load article";

  try {
    if (!articleId) {
      throw new Error("Article ID is required");
    }

    const url = `${BASE_URL}/content/news/${articleId}`;

    // Combine caller's abort signal with timeout
    const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const combinedSignal = signal
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal;

    const response = await fetch(url, {
      signal: combinedSignal,
      headers: REQUEST_HEADERS,
    });

    if (!response.ok) {
      throw new Error(
        `${context}: HTTP ${response.status} ${response.statusText}`,
      );
    }

    // Read response as text first to handle incomplete JSON gracefully
    const text = await response.text();

    if (!text || text.trim() === "") {
      return null;
    }

    try {
      const data = JSON.parse(text);
      return validateArticle(data);
    } catch {
      console.error("JSON parse error, response was:", text.substring(0, 200));
      return null;
    }
  } catch (error) {
    // Re-throw abort errors without wrapping, they're intentional
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    throw classifyError(error, context);
  }
}
