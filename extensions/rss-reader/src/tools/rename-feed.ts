import { LocalStorage, showToast, Toast } from "@raycast/api";
import { getFeeds } from "../feeds";

type Input = {
  /**
   * The URL of the RSS feed to rename.
   */
  url: string;
  /**
   * The new title for the feed. Leave empty to restore the original title.
   */
  newTitle?: string;
};

/**
 * Rename an RSS feed.
 * Changes the display title of an RSS feed subscription. If no new title is provided, restores the original title.
 */
export default async function (input: Input) {
  const { url, newTitle } = input;

  const feeds = await getFeeds();
  const feedIndex = feeds.findIndex((f) => f.url === url);

  if (feedIndex === -1) {
    throw new Error(`Feed not found: ${url}`);
  }

  const feed = feeds[feedIndex];

  // If newTitle is empty or undefined, restore original title
  const updatedTitle = newTitle?.trim() || feed.originalTitle || feed.title;

  feeds[feedIndex] = {
    ...feed,
    title: updatedTitle,
  };

  await LocalStorage.setItem("feeds", JSON.stringify(feeds));

  await showToast({
    style: Toast.Style.Success,
    title: "Feed renamed",
    message: updatedTitle,
  });

  return {
    url: feed.url,
    oldTitle: feed.title,
    newTitle: updatedTitle,
    originalTitle: feed.originalTitle,
  };
}
