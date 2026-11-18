import { hubSearchURL, type HubListResponse, type HubSort } from "../lib/hub-api";

type Input = {
  /** Search query. */
  query: string;
  /** Filter by language id. */
  language?: string;
  /** Sort order: relevance, popular, recent, or imports. */
  sort?: HubSort;
  /** Maximum number of results (default 20). */
  limit?: number;
};

export default async function tool(input: Input) {
  const response = await fetch(
    hubSearchURL({ q: input.query, language: input.language, sort: input.sort, limit: input.limit ?? 20 }),
  );
  if (!response.ok) {
    throw new Error(`Hub search failed (HTTP ${response.status} ${response.statusText}).`);
  }
  const json = (await response.json()) as HubListResponse;
  return (json.data ?? []).map((snippet) => ({
    id: snippet.id,
    title: snippet.title,
    language: snippet.language,
    description: snippet.description,
    author: snippet.author_display_name || snippet.author_username,
    views: snippet.view_count,
    url: `https://snipperapp.com/s/${snippet.id}`,
  }));
}
