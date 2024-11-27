import { showToast, Toast } from "@raycast/api";
import { TweetV1 } from "twitter-api-v2";
import { TweetList } from "./tweet";
import { loggedInUserAccount, refreshTweets, twitterClient, useRefresher } from "../lib/twitterapi";

export function MyTweetList() {
  const { data, error, isLoading, fetcher } = useRefresher<TweetV1[] | undefined>(
    async (updateInline): Promise<TweetV1[] | undefined> => {
      return updateInline ? await refreshTweets(data) : await getMyTweets();
    },
  );
  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: error });
  }
  return <TweetList isLoading={isLoading} tweets={data} fetcher={fetcher} />;
}

async function getMyTweets(): Promise<TweetV1[]> {
  const account = await loggedInUserAccount();
  const mytweets = await twitterClient().v1.userTimelineByUsername(account.screen_name);
  const tweets: TweetV1[] = [];
  for (const t of mytweets.tweets) {
    tweets.push(t);
  }
  return tweets;
}
