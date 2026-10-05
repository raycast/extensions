import { GrokipediaClient } from "../grokipedia/client";
import { getArticleUrl } from "../grokipedia/articles";
import { GrokipediaValidationError } from "../grokipedia/errors";

type Input = {
  /** The topic or search terms to find on Grokipedia. */
  query: string;
  /** Number of results, between 1 and 50. Defaults to 12. */
  limit?: number;
  /** Number of results to skip. Use nextOffset from a previous search for the next page. Defaults to 0. */
  offset?: number;
};

const client = new GrokipediaClient();

/** Search Grokipedia for article titles and snippets. Read an article with get-article before summarizing it. */
export default async function searchArticles(input: Input) {
  const query = input.query.trim();
  if (!query) throw new GrokipediaValidationError("Provide a topic to search for.");
  const limit = input.limit ?? 12;
  const offset = input.offset ?? 0;
  const response = await client.search(query, limit, offset);
  const hasMore =
    response.totalCount === undefined ? response.results.length === limit : offset + limit < response.totalCount;
  return {
    query,
    results: response.results.map((result) => ({ ...result, url: getArticleUrl(result.slug) })),
    totalCount: response.totalCount,
    nextOffset: hasMore ? offset + limit : null,
  };
}
