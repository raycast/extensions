import { Interview, Beta, Feed, FeedItemInterface, FeedType, Tool } from "./responseTypes";
import { buildFeed } from "./xml";

export const getFeed = async (feedType: FeedType): Promise<Feed<FeedItemInterface>> => {
  const url =
    feedType === "interviews" ? "https://feeds.simplecast.com/T80CJwln" : `https://console.dev/${feedType}/rss.xml`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.statusText);
  const txt = await res.text();
  const feed = await buildFeed(txt);
  return feed;
};
export const getToolsFeed = (): Promise<Feed<Tool>> => getFeed("tools");

export const getBetasFeed = (): Promise<Feed<Beta>> => getFeed("betas");

export const getInterviewsFeed = (): Promise<Feed<Interview>> => getFeed("interviews");
