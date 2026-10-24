import { getPreferenceValues } from "@raycast/api";
import { markReadAndRefresh } from "../lib/ai";
import { readStoryContent } from "../lib/article";
import { getItem, getTopComments, HnItem, truncate } from "../lib/hn-api";
import {
  getCommentsFromContent,
  getPointsFromContent,
  getReadStories,
  refreshStories,
  resetIfPointsChanged,
  storyId,
} from "../lib/stories";
import { Story } from "../types";

type Input = {
  /**
   * How many stories the user asked about: 1 for "the latest story", 2 for "the last two". Leave it out when they didn't give a number. It can only lower the user's Stories per Summary setting, never raise it.
   */
  count?: number;
};

const maxArticleLength = 5_000;
const maxCommentLength = 800;

async function prepareStory(story: Story) {
  const id = storyId(story);
  const item: HnItem = await getItem(id).catch(() => ({ id: Number(id), type: "story", url: story.url }));
  const [article, topComments] = await Promise.all([
    readStoryContent(item).then(
      ({ content }) => ({ text: truncate(content, maxArticleLength), error: undefined }),
      (error: Error) => ({ text: undefined, error: error.message }),
    ),
    getTopComments(item, 2).catch(() => []),
  ]);
  return {
    id,
    title: story.title,
    points: Number(getPointsFromContent(story.content_html)) || undefined,
    commentCount: Number(getCommentsFromContent(story.content_html)) || 0,
    links:
      story.url === story.external_url
        ? `[Comments](${story.external_url})`
        : `[Article](${story.url}) | [Comments](${story.external_url})`,
    article: article.text,
    articleError: article.error,
    topComments: topComments.map((comment) => ({ ...comment, text: truncate(comment.text, maxCommentLength) })),
  };
}

/**
 * Get the user's unread Hacker News stories, newest first, ready to summarize: each comes with the text of its article, its top two comments, and links to the article and the discussion. Use it for any question about Hacker News, what's new, or the user's stories. Every story it returns is marked read, so summarize all of them. moreUnread is how many unread stories were left out.
 */
export default async function tool({ count }: Input) {
  const { points, summaryLimit, markReadByAi } = getPreferenceValues<Preferences>();
  resetIfPointsChanged(points);
  const { recent } = await refreshStories(points);
  const readStories = getReadStories();
  const unread = recent.filter(({ external_url }) => !readStories.has(external_url));
  const perSummary = Number(summaryLimit) || 3;
  const limit = count ? Math.min(Math.max(Math.trunc(count), 1), perSummary) : perSummary;
  const batch = unread.slice(0, limit);

  const stories = await Promise.all(batch.map(prepareStory));
  if (markReadByAi && batch.length) await markReadAndRefresh(batch.map(({ external_url }) => external_url));
  const cappedBySetting = limit === perSummary && unread.length > batch.length;
  return {
    // The same format in the manifest's AI instructions was ignored in testing
    howToReply:
      "For each story write: its title in bold with its points; a two or three sentence summary of the article (or of the comments when articleError is set); its two top comments, one line each starting with the commenter's name; then its links line exactly as given. After the stories, say how many more are unread when moreUnread is above zero, or that the user is all caught up when there are no stories.",
    limitNote: `returning latest ${batch.length} unread ${batch.length === 1 ? "story" : "stories"}${cappedBySetting ? " (per extension config)" : ""}. The config is the user's Stories per Summary setting in Raycast Settings → Extensions → Hacker News Top Stories. This is for you, not the reply: mention it only if the user asks why they got this many or wants more at once.`,
    stories,
    moreUnread: unread.length - batch.length,
  };
}
