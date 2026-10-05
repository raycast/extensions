import { assertStoryId } from "../lib/ai";
import { htmlToText, searchComments, truncate } from "../lib/hn-api";

type Input = {
  /**
   * The words to search comments for.
   */
  query: string;
  /**
   * The Hacker News id of a story to search within, e.g. from summarize-unread-stories. Leave it out to search comments across all of Hacker News.
   */
  storyId?: string;
};

/**
 * Search Hacker News comments by keyword, ranked by relevance. Searches one story's discussion when given its id, otherwise all of Hacker News.
 */
export default async function tool({ query, storyId }: Input) {
  if (storyId) assertStoryId(storyId);
  const { nbHits, hits } = await searchComments(query, { storyId });
  return {
    totalMatches: nbHits,
    comments: hits.map((hit) => ({
      id: hit.objectID,
      author: hit.author,
      text: truncate(htmlToText(hit.comment_text), 1_500),
      posted: hit.created_at,
      storyId: String(hit.story_id),
      storyTitle: hit.story_title,
      url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
    })),
  };
}
