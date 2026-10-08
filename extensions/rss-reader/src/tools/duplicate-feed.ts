import { LocalStorage, showToast, Toast } from "@raycast/api";
import { getFeeds } from "../feeds";

type Input = {
  /**
   * The URL of the RSS feed to duplicate.
   */
  sourceUrl: string;
  /**
   * The new URL for the duplicated feed.
   */
  newUrl: string;
  /**
   * Optional new title for the duplicated feed. If not provided, uses the original title.
   */
  newTitle?: string;
};

/**
 * Duplicate an RSS feed subscription.
 * Creates a copy of an existing feed with a new URL. Useful for creating variations of similar feeds.
 */
export default async function (input: Input) {
  const { sourceUrl, newUrl, newTitle } = input;

  const feeds = await getFeeds();
  const sourceFeed = feeds.find((f) => f.url === sourceUrl);

  if (!sourceFeed) {
    throw new Error(`Source feed not found: ${sourceUrl}`);
  }

  // Check if new URL already exists
  if (feeds.some((f) => f.url === newUrl)) {
    throw new Error(`Feed with URL already exists: ${newUrl}`);
  }

  // Create duplicated feed
  const duplicatedFeed = {
    ...sourceFeed,
    url: newUrl.trim(),
    title: newTitle?.trim() || sourceFeed.title,
  };

  feeds.push(duplicatedFeed);
  await LocalStorage.setItem("feeds", JSON.stringify(feeds));

  await showToast({
    style: Toast.Style.Success,
    title: "Feed duplicated",
    message: duplicatedFeed.title,
  });

  return {
    sourceUrl,
    newUrl: duplicatedFeed.url,
    title: duplicatedFeed.title,
  };
}
