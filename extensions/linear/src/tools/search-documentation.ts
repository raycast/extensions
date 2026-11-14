const APPLICATION_ID = "9RXBCYQ6DV";
const SEARCH_API_KEY = "b52da28605c5df5ebf54e3cd09d1302e";
const SEARCH_ENDPOINT = `https://${APPLICATION_ID.toLowerCase()}-dsn.algolia.net/1/indexes/docs/query`;
const RESULTS_PER_PAGE = 16;

type Input = {
  query: string;
  page?: number;
};

type SearchHit = {
  objectID: string;
  title: string;
  slug: string;
  content: string;
  _snippetResult?: { content?: { value?: string } };
};

type SearchResponse = {
  hits: SearchHit[];
  page: number;
  nbPages: number;
};

/** Searches Linear's public documentation index and returns the same normalized fields as the official MCP tool. */
export default async function searchDocumentation(input: Input) {
  const query = input.query.trim();
  if (!query) throw new Error("Search query cannot be empty.");

  const page = Math.max(0, Math.floor(input.page ?? 0));
  const response = await fetch(SEARCH_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-algolia-application-id": APPLICATION_ID,
      "x-algolia-api-key": SEARCH_API_KEY,
    },
    body: JSON.stringify({
      query,
      page,
      hitsPerPage: RESULTS_PER_PAGE,
      attributesToRetrieve: ["objectID", "title", "slug", "content"],
      attributesToSnippet: ["content:30"],
      snippetEllipsisText: "…",
    }),
  });

  if (!response.ok) {
    throw new Error(`Linear documentation search failed (${response.status} ${response.statusText}).`);
  }

  const result = (await response.json()) as SearchResponse;
  if (page >= result.nbPages && result.nbPages > 0) return [];

  return result.hits.map((hit) => ({
    id: hit.objectID,
    title: hit.title,
    url: `https://linear.app/docs/${hit.slug}`,
    snippet: stripHighlightTags(hit._snippetResult?.content?.value) || hit.content,
  }));
}

function stripHighlightTags(value?: string): string {
  return value?.replace(/<\/?em>/g, "") ?? "";
}
