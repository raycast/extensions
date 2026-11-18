import { getPreview } from "../api";
import { previewMarkdown } from "../lib/preview";
import { truncate } from "../lib/text";

type Input = {
  /**
   * The page's URL exactly as search-pages returned it.
   */
  url: string;
};

const maxLength = 40_000;

/**
 * Read what one page in the user's Hister index says, as markdown, from the copy Hister stored when the user visited it. Very long pages are cut short.
 */
export default async function tool({ url }: Input) {
  const preview = await getPreview(url.trim());
  const content = previewMarkdown(preview);
  return {
    title: preview.title,
    url,
    firstIndexed: preview.added ? new Date(preview.added * 1000).toISOString() : undefined,
    truncated: content.length > maxLength,
    content: truncate(content, maxLength),
  };
}
