import { searchArticles } from "../lib/api";
import { clamp, compactArticle, requireSession } from "../lib/tool";

type Input = {
  /** Words to look for in titles, authors and the full text of the articles. */
  query: string;
  /** How many results to return. 10 by default, 30 at most. */
  limit?: number;
};

/**
 * Full-text search over everything the user saved in Texthyper, the archive
 * included, best match first. Each result has an excerpt around the match.
 */
export default async function tool(input: Input) {
  await requireSession();
  const page = await searchArticles(input.query, { limit: clamp(input.limit, 10, 30) });
  return { articles: page.articles.map(compactArticle) };
}
