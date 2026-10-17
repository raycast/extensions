import { LocalStorage, showToast, Toast } from "@raycast/api";
import { getFeeds, Feed } from "../feeds";
import Parser from "rss-parser";

const parser = new Parser({});

type Input = {
  /**
   * The URL of the RSS feed to subscribe to.
   */
  url: string;
  /**
   * Optional custom title for the feed. If not provided, uses the feed's original title.
   */
  customTitle?: string;
};

/**
 * Subscribe to a new RSS feed.
 * Adds a new RSS feed subscription to the user's feed list.
 */
export default async function (input: Input) {
  const { url, customTitle } = input;

  // Validate and fetch feed
  let feedData;
  try {
    feedData = await parser.parseURL(url);
  } catch {
    throw new Error(`Invalid RSS feed URL: ${url}`);
  }

  const feeds = await getFeeds();

  // Check if feed already exists
  if (feeds.some((f) => f.url === url)) {
    throw new Error(`Already subscribed to this feed: ${feedData.title || url}`);
  }

  const newFeed: Feed = {
    url,
    title: customTitle || feedData.title || url,
    link: feedData.link,
    icon: feedData.image?.url || feedData.itunes?.image || "📰",
    originalTitle: feedData.title,
  };

  feeds.push(newFeed);
  await LocalStorage.setItem("feeds", JSON.stringify(feeds));

  await showToast({
    style: Toast.Style.Success,
    title: "Subscribed to feed",
    message: newFeed.title,
  });

  return {
    url: newFeed.url,
    title: newFeed.title,
    link: newFeed.link,
    originalTitle: newFeed.originalTitle,
  };
}
