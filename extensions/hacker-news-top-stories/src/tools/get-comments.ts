import { assertStoryId, markOpenedStoryRead } from "../lib/ai";
import { AlgoliaItem, getItem, getItemTree, htmlToText, truncate } from "../lib/hn-api";

type Input = {
  /**
   * The Hacker News id of the story, e.g. from summarize-unread-stories.
   */
  id: string;
};

const maxDepth = 2;
const maxCommentLength = 1_500;
const maxTotalLength = 40_000;

type Comment = { id: number; author: string; depth: number; text: string };

function flatten(items: AlgoliaItem[], depth = 0): Comment[] {
  if (depth > maxDepth) return [];
  return items.flatMap((item) => [
    ...(item.text && item.author
      ? [{ id: item.id, author: item.author, depth, text: truncate(htmlToText(item.text), maxCommentLength) }]
      : []),
    ...flatten(item.children, depth + 1),
  ]);
}

/**
 * Get what people on Hacker News are saying about a story: its comments, in the order Hacker News ranks the top-level threads. Replies follow the comment they answer, with depth 0 for top-level comments. Long threads are cut short; use search-comments to find something specific.
 */
export default async function tool({ id }: Input) {
  assertStoryId(id);
  const [item, tree] = await Promise.all([getItem(id), getItemTree(id)]);
  // The comment tree is in posting order; only the item's kids carry Hacker News's ranking
  const rank = new Map(item.kids?.map((kid, index) => [kid, index]));
  const threads = [...tree.children].sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity));

  const comments: Comment[] = [];
  let length = 0;
  for (const comment of flatten(threads)) {
    length += comment.text.length;
    if (length > maxTotalLength) break;
    comments.push(comment);
  }

  return {
    title: item.title,
    markedAsRead: await markOpenedStoryRead(id),
    discussionUrl: `https://news.ycombinator.com/item?id=${item.id}`,
    totalComments: item.descendants ?? comments.length,
    commentsShown: comments.length,
    comments,
  };
}
