import { NodeHtmlMarkdown } from "node-html-markdown";
import { getArticle } from "../lib/api";
import { part } from "../lib/logic";
import { compactArticle, compactHighlight, requireSession } from "../lib/tool";

type Input = {
  /** The article's id, from search-articles or list-articles. */
  id: number;
  /** Where to continue a long article: the next_offset of the previous part. */
  offset?: number;
};

/**
 * One saved article's text as Markdown, with its highlights and notes. Long
 * articles come in parts of about 40,000 characters: when next_offset is
 * not null, call again with it as offset for the rest.
 */
export default async function tool(input: Input) {
  await requireSession();
  const article = await getArticle(input.id);
  if (article.status === "pending")
    return { ...compactArticle(article), text: null, note: "Still being extracted. Try again in a moment." };

  const markdown = NodeHtmlMarkdown.translate(article.content_html ?? "");
  const { text, next_offset } = part(markdown, input.offset);
  return {
    ...compactArticle(article),
    text,
    next_offset,
    highlights: input.offset ? undefined : (article.highlights ?? []).map((highlight) => compactHighlight(highlight)),
  };
}
