import { assertStoryId, markOpenedStoryRead } from "../lib/ai";
import { readStoryContent } from "../lib/article";
import { getItem, truncate } from "../lib/hn-api";

type Input = {
  /**
   * The Hacker News id of the story, e.g. from summarize-unread-stories.
   */
  id: string;
};

const maxLength = 30_000;

/**
 * Read the full text of what a Hacker News story links to, or of the post itself for Ask HN and other text posts, when the user wants more on one story than a summary. Use get-comments for the discussion.
 */
export default async function tool({ id }: Input) {
  assertStoryId(id);
  const item = await getItem(id);
  const { source, content } = await readStoryContent(item);
  return {
    title: item.title,
    markedAsRead: await markOpenedStoryRead(id),
    url: item.url,
    source,
    truncated: content.length > maxLength,
    content: truncate(content, maxLength),
  };
}
