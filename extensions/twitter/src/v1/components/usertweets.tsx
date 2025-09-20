import { showToast, Toast } from "@raycast/api";
import { TweetV1 } from "twitter-api-v2";
import { TweetList } from "./tweet";
import { refreshTweets, twitterClient, useRefresher } from "../lib/twitterapi";

export function UserTweetList(props: { username: string }) {
  const username = props.username;
  const { data, error, isLoading, fetcher } = useRefresher<TweetV1[] | undefined>(
    async (updateInline): Promise<TweetV1[] | undefined> => {
      return updateInline ? await refreshTweets(data) : await getTweets(username);
    },
  );
  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: error });
  }
  return <TweetList isLoading={isLoading} tweets={data} fetcher={fetcher} />;
}

async function getTweets(username: string): Promise<TweetV1[]> {
  const usertweets = await twitterClient().v1.userTimelineByUsername(username);
  const tweets: TweetV1[] = [];
  for (const t of usertweets.tweets) {
    tweets.push(t);
  }
  return tweets;
}
