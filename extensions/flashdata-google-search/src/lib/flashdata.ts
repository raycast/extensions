export const SEARCH_ENDPOINT = "https://data.flashdata.dev/v1/queries/realtime";

export type SearchInput = {
  query: string;
  country: string;
  language: string;
  count: string;
  page: string;
};

export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
  position?: number;
};

export type SearchResponse = {
  results: SearchResult[];
  raw: Record<string, unknown>;
};

function integer(value: string, name: string): number {
  const n = Number(value);
  if (!/^\d+$/.test(value.trim()) || !Number.isInteger(n) || n < 1 || n > 100) {
    throw new Error(`${name} must be a whole number between 1 and 100.`);
  }
  return n;
}

export function buildRequest(input: SearchInput) {
  const query = input.query.trim();
  if (!query || query.length > 2000) {
    throw new Error("Enter a search query between 1 and 2,000 characters.");
  }
  const gl = input.country.trim().toLowerCase();
  const hl = input.language.trim();
  if (gl && !/^[a-z]{2}$/.test(gl)) {
    throw new Error("Country must be a two-letter code, such as us or gb.");
  }
  return {
    source: "google_search",
    query,
    params: {
      num: integer(input.count, "Result count"),
      page: integer(input.page, "Page"),
      ...(gl ? { gl } : {}),
      ...(hl ? { hl } : {}),
    },
  };
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function webUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function parseResponse(data: unknown): SearchResponse {
  if (!object(data) || data.status !== "done" || !Array.isArray(data.results) || !object(data.results[0])) {
    throw new Error("FlashData did not return a completed search. Check your query history before trying again.");
  }
  const organic = data.results[0].organic;
  // A completed search may legitimately have no organic results.
  if (organic !== undefined && !Array.isArray(organic)) {
    throw new Error("The search response has an unexpected format. Check your FlashData query history.");
  }
  const results: SearchResult[] = (organic ?? []).flatMap((item: unknown) => {
    if (!object(item) || !webUrl(item.link)) return [];
    return [
      {
        title: typeof item.title === "string" ? item.title : item.link,
        url: item.link,
        snippet: typeof item.snippet === "string" ? item.snippet : "",
        ...(typeof item.position === "number" ? { position: item.position } : {}),
      },
    ];
  });
  return { results, raw: data };
}

export async function searchGoogle(input: SearchInput, apiKey: string): Promise<SearchResponse> {
  const body = buildRequest(input);
  if (!apiKey.trim()) throw new Error("Add your FlashData API key in the extension preferences.");
  let response: Response;
  try {
    response = await fetch(SEARCH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "X-API-Key": apiKey.trim() },
      body: JSON.stringify(body),
      redirect: "error",
      signal: AbortSignal.timeout(90_000),
    });
  } catch {
    throw new Error(
      "No response received. The search may still have completed; check FlashData history before retrying.",
    );
  }
  if (!response.ok) {
    const help: Record<number, string> = {
      400: "Check your search parameters.",
      401: "Check your FlashData API key.",
      402: "Check your FlashData Credits balance.",
      403: "Check that your key allows Google Search.",
      422: "Check your search parameters.",
      429: "Your rate limit was reached. Try again later.",
    };
    throw new Error(
      `FlashData returned HTTP ${response.status}. ${help[response.status] ?? "Check your query history before retrying."}`,
    );
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error("FlashData returned an unreadable response. Check your query history before retrying.");
  }
  return parseResponse(data);
}

export function resultsMarkdown(query: string, results: SearchResult[]): string {
  return [
    `# Google Search: ${query}`,
    ...results.map((r) => `${r.position ?? "•"}. ${r.title}\n${r.url}\n${r.snippet}`),
  ].join("\n\n");
}

export function markdownText(text: string): string {
  return text.replace(/[\\`*_{}[\]()<>!#|]/g, "\\$&");
}
