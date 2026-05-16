type DocSearchResult = {
  query: string;
  results: Array<{ title: string; url: string; snippet?: string }>;
};

export async function searchDocs(query: string, signal?: AbortSignal): Promise<DocSearchResult> {
  const url = `https://posthog.com/api/search.json?query=${encodeURIComponent(query)}`;
  const response = await fetch(url, { signal });
  if (!response.ok) {
    return { query, results: [] };
  }
  const data = (await response.json()) as { hits?: Array<{ title?: string; url?: string; content?: string }> };
  const results = (data.hits ?? []).slice(0, 10).map((h) => ({
    title: h.title ?? "",
    url: h.url ?? "",
    snippet: h.content?.slice(0, 200),
  }));
  return { query, results };
}
