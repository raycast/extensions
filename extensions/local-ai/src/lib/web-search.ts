import { getPreferenceValues } from "@raycast/api";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface BraveWebResult {
  title: string;
  url: string;
  description: string;
}

interface BraveSearchResponse {
  web?: { results: BraveWebResult[] };
}

/**
 * Search the web using the Brave Search API.
 * Requires a free API key from https://brave.com/search/api/
 * Free tier: 2,000 queries/month.
 */
export async function webSearch(
  query: string,
  maxResults = 5,
): Promise<SearchResult[]> {
  const prefs = getPreferenceValues<Preferences>();
  const apiKey = prefs.searchApiKey?.trim();

  if (!apiKey) {
    throw new Error("No Brave Search API key configured");
  }

  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${maxResults}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
    signal: AbortSignal.timeout(8000),
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      "Invalid Brave Search API key. Check your key in extension preferences.",
    );
  }

  if (res.status === 429) {
    throw new Error(
      "Brave Search rate limit reached. Free tier allows 2,000 queries/month.",
    );
  }

  if (!res.ok) {
    throw new Error(`Brave Search returned ${res.status}`);
  }

  let data: BraveSearchResponse;
  try {
    data = (await res.json()) as BraveSearchResponse;
  } catch {
    throw new Error(
      "Brave Search returned invalid response data. Try again later.",
    );
  }
  const results = data.web?.results ?? [];

  return results.slice(0, maxResults).map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.description,
  }));
}

/**
 * Format search results as context for injection into the LLM prompt.
 */
export function formatSearchContext(results: SearchResult[]): string {
  if (results.length === 0) return "";

  const lines = results.map(
    (r, i) => `${i + 1}. [${r.title}](${r.url})\n   ${r.snippet}`,
  );
  return `Web search results:\n\n${lines.join("\n\n")}`;
}

// ── shouldSearch heuristic ──────────────────────────────────────────────

const SEARCH_TRIGGERS = [
  // Temporal / current events
  /\b(latest|current|recent|today|yesterday|this week|this month|this year|right now)\b/i,
  /\b(news|headline|update|announcement)\b/i,
  /\b202[4-9]\b/, // Year references
  // Factual lookups
  /\b(price of|cost of|weather in|weather for|stock price|exchange rate)\b/i,
  /\b(who is|who was|who are|what is|what are|what was|when did|when was|when is|where is|where was)\b/i,
  /\b(how much|how many|how old|how tall|how far)\b/i,
  // Explicit search intent
  /\b(search for|look up|find out|google|search the web)\b/i,
  // URLs / domains
  /\b(https?:\/\/|www\.)\S+/i,
  /\b\w+\.(com|org|net|io|dev|co)\b/i,
];

const SKIP_PATTERNS = [
  // Code-related (usually don't need web search)
  /^(write|create|generate|make|build|implement|code|fix|debug|refactor)\s/i,
  /```/,
  /\b(function|class|const|let|var|import|export|return|if|else|for|while)\b/,
  // Math
  /^\d+\s*[+\-*/^%]\s*\d+/,
  // Creative writing
  /^(write me a|compose|draft)\s+(poem|story|essay|letter|email|song)/i,
  // Translation (handled by translate command)
  /^translate\s/i,
];

/**
 * Heuristic: should we perform a web search for this query?
 * Returns true if the query likely needs up-to-date information.
 */
export function shouldSearch(query: string): boolean {
  const trimmed = query.trim();
  if (trimmed.length < 5) return false;

  // Check skip patterns first (these override triggers)
  for (const pattern of SKIP_PATTERNS) {
    if (pattern.test(trimmed)) return false;
  }

  // Check if any trigger matches
  for (const pattern of SEARCH_TRIGGERS) {
    if (pattern.test(trimmed)) return true;
  }

  return false;
}
