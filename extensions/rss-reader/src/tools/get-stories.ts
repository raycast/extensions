import { getFeeds } from "../feeds";
import Parser from "rss-parser";
import { LocalStorage } from "@raycast/api";

const parser = new Parser({});

type Input = {
  /**
   * Filter stories by feed URL. If not provided, returns stories from all feeds.
   */
  feedUrl?: string;
  /**
   * Maximum number of stories to return. Defaults to 50.
   */
  limit?: number;
  /**
   * Whether to return only unread stories. Defaults to false.
   */
  unreadOnly?: boolean;
};

/**
 * Get RSS stories from subscribed feeds.
 * Returns the latest stories from RSS feeds, optionally filtered by feed URL or read status.
 */
export default async function (input: Input = {}) {
  const { feedUrl, limit = 50, unreadOnly = false } = input;

  const allFeeds = await getFeeds();
  const feeds = feedUrl ? allFeeds.filter((f) => f.url === feedUrl) : allFeeds;

  if (feeds.length === 0) {
    throw new Error(feedUrl ? `Feed not found: ${feedUrl}` : "No feeds subscribed");
  }

  const storyLastViewedString = await LocalStorage.getItem<string>("storyLastRead");
  const storyLastRead: Record<string, number> = JSON.parse(storyLastViewedString ?? "{}");

  const stories = [];

  for (const feed of feeds) {
    try {
      const parsedFeed = await parser.parseURL(feed.url);
      for (const item of parsedFeed.items) {
        const guid = item.guid || item.link || "";
        const lastRead = storyLastRead[guid] || 0;

        if (unreadOnly && lastRead > 0) {
          continue;
        }

        stories.push({
          guid,
          title: item.title || "No title",
          link: item.link,
          pubDate: item.pubDate,
          content: item.content || item.contentSnippet,
          feedTitle: feed.title,
          feedUrl: feed.url,
          lastRead: lastRead > 0 ? new Date(lastRead).toISOString() : undefined,
        });
      }
    } catch (error) {
      console.error(`Error fetching feed ${feed.url}:`, error);
    }
  }

  // Sort by publication date (newest first)
  stories.sort((a, b) => {
    const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return dateB - dateA;
  });

  return stories.slice(0, limit);
}
