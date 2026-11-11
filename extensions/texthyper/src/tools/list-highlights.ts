import { currentLibrary } from "../lib/library";
import { quoteText } from "../lib/logic";
import { clamp, compactHighlight, requireSession } from "../lib/tool";

type Input = {
  /** Only this article's highlights. Without it, highlights from the whole library. */
  article_id?: number;
  /** Only highlights whose quote, note, article title or author contains this text. */
  query?: string;
  /** How many highlights to return. 50 by default, 200 at most. */
  limit?: number;
};

/**
 * The passages the user highlighted in Texthyper and the notes they wrote
 * on them, newest first, each with the article it is from.
 */
export default async function tool(input: Input) {
  await requireSession();
  const library = await currentLibrary();
  const needle = input.query?.trim().toLowerCase();

  const highlights = Object.values(library.highlights)
    .filter((highlight) => !input.article_id || highlight.article_id === input.article_id)
    .filter((highlight) => {
      if (!needle) return true;
      const article = library.articles[highlight.article_id];
      return [quoteText(highlight), highlight.comment, article?.title, article?.author]
        .filter(Boolean)
        .some((text) => text!.toLowerCase().includes(needle));
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const limit = clamp(input.limit, 50, 200);
  return {
    highlights: highlights
      .slice(0, limit)
      .map((highlight) => compactHighlight(highlight, library.articles[highlight.article_id])),
    total: highlights.length,
  };
}
