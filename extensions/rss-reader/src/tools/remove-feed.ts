import { Action, LocalStorage, showToast, Toast, Tool } from "@raycast/api";
import { getFeeds } from "../feeds";

type Input = {
  /**
   * The URL of the RSS feed to unsubscribe from.
   */
  url: string;

  /**
   * The feed properties to display to the user for confirmation.
   */
  confirmation: {
    title: string;
    link?: string;
    originalTitle?: string;
  };
};

/**
 * Unsubscribe from an RSS feed.
 * Removes an RSS feed subscription from the user's feed list.
 */
export default async function (input: Input) {
  const { url } = input;

  const feeds = await getFeeds();
  const feedIndex = feeds.findIndex((f) => f.url === url);

  if (feedIndex === -1) {
    throw new Error(`Feed not found: ${url}`);
  }

  const removedFeed = feeds[feedIndex];
  feeds.splice(feedIndex, 1);

  await LocalStorage.setItem("feeds", JSON.stringify(feeds));

  await showToast({
    style: Toast.Style.Success,
    title: "Unsubscribed from feed",
    message: removedFeed.title,
  });

  return {
    url: removedFeed.url,
    title: removedFeed.title,
  };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const { title, link, originalTitle } = input.confirmation;

  const info = [{ name: "Title", value: title }];

  if (link) {
    info.push({ name: "Link", value: link });
  }

  if (originalTitle && originalTitle !== title) {
    info.push({ name: "Original Title", value: originalTitle });
  }

  info.push({ name: "URL", value: input.url });

  return { style: Action.Style.Destructive, info };
};
