import { listArticles } from "../lib/api";
import { clamp, compactArticle, requireSession } from "../lib/tool";

type Input = {
  /** Which list: "unread" (the default), "liked", "archived" or "all". */
  state?: "unread" | "liked" | "archived" | "all";
  /** Only articles with this tag. */
  tag?: string;
  /** How many articles to return. 20 by default, 100 at most. */
  limit?: number;
};

/**
 * The user's saved articles in Texthyper, newest first, without their text.
 * Use read-article for the text of one.
 */
export default async function tool(input: Input) {
  await requireSession();
  const page = await listArticles({ state: input.state, tag: input.tag, limit: clamp(input.limit, 20, 100) });
  return { articles: page.articles.map(compactArticle), has_more: Boolean(page.next_cursor) };
}
