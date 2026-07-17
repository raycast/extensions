import { showToast, Toast } from "@raycast/api";
import { ReactElement } from "react";
import { TweetV1 } from "twitter-api-v2";
import { TweetList } from "./tweet";
import { refreshTweets, twitterClient, useRefresher } from "../lib/twitterapi";

async function getHomeTimelineTweets(): Promise<TweetV1[]> {
  const homeTimeline = await twitterClient().v1.homeTimeline({
    exclude_replies: true,
  });
  const tweets: TweetV1[] = [];
  const tweetsRaw = await homeTimeline.fetchLast(0);
  for (const t of tweetsRaw) {
    tweets.push(t);
  }
  return tweets;
}

export function HomeTimelineList() {
  const { data, error, isLoading, fetcher } = useRefresher<TweetV1[] | undefined>(
    async (updateInline): Promise<TweetV1[] | undefined> => {
      return updateInline ? await refreshTweets(data) : await getHomeTimelineTweets();
    },
  );
  if (error) {
    showToast(Toast.Style.Failure, "Error", error);
  }
  return <TweetList isLoading={isLoading} tweets={data} fetcher={fetcher} />;
}

export function HomeTimelineRoot(): ReactElement {
  return <HomeTimelineList />;
}
