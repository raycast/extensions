import { getFeeds } from "../feeds";

/**
 * Get all RSS feed subscriptions.
 * Returns a list of all feeds the user is subscribed to.
 */
export default async function () {
  const feeds = await getFeeds();
  return feeds.map((feed) => ({
    url: feed.url,
    title: feed.title,
    link: feed.link,
    originalTitle: feed.originalTitle,
  }));
}
