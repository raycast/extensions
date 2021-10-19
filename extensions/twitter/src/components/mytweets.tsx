import { List, showToast, ToastStyle } from "@raycast/api";
import { useState, useEffect } from "react";
import { TweetV1 } from "twitter-api-v2";
import { TweetListItem } from "../components/tweet";
import { loggedInUserAccount, twitterClient } from "../twitterapi";

export default function MyTweetList() {
  const { data, error, isLoading, fetcher } = useTweets();
  if (error) {
    showToast(ToastStyle.Failure, "Error", error);
  }
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter My Tweets by name...">
      {data?.map((tweet) => (
        <TweetListItem key={tweet.id_str} tweet={tweet} fetcher={fetcher} />
      ))}
    </List>
  );
}

export interface Fetcher {
  updateInline: () => Promise<void>;
  refresh: () => Promise<void>;
}

async function refreshTweets(tweets?: TweetV1[]): Promise<TweetV1[] | undefined> {
  if (tweets) {
    const tweetIds = tweets.map((t) => t.id_str);
    const unorderedFreshTweets = await twitterClient.v1.tweets(tweetIds);

    let freshTweets: TweetV1[] = [];
    for (const tid of tweetIds) {
      const t = unorderedFreshTweets.find((t) => tid === t.id_str);
      if (t) {
        freshTweets.push(t);
      }
    }
    return freshTweets;
  } else {
    return undefined;
  }
}

async function getMyTweets(): Promise<TweetV1[]> {
  const account = await loggedInUserAccount();
  const mytweets = await twitterClient.v1.userTimelineByUsername(account.screen_name);
  let tweets: TweetV1[] = [];
  for (const t of mytweets.tweets) {
    tweets.push(t);
  }
  return tweets;
}

export function useTweets(): {
  data: TweetV1[] | undefined;
  error?: string;
  isLoading: boolean;
  fetcher: Fetcher;
} {
  const [data, setData] = useState<TweetV1[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [timestamp, setTimestamp] = useState<Date>(new Date());

  let cancel = false;

  const fetcher: Fetcher = {
    updateInline: async () => {
      await fetchData(true);
    },
    refresh: async () => {
      setTimestamp(new Date());
    },
  };

  async function fetchData(updateInline = false) {
    if (cancel) {
      return;
    }

    setIsLoading(true);
    setError(undefined);

    try {
      const tweets = updateInline ? await refreshTweets(data) : await getMyTweets();
      if (!cancel) {
        setData(tweets);
      }
    } catch (e: any) {
      if (!cancel) {
        setError(e.message);
      }
    } finally {
      if (!cancel) {
        setIsLoading(false);
      }
    }
  }
  useEffect(() => {
    fetchData();

    return () => {
      cancel = true;
    };
  }, [timestamp]);

  return { data, error, isLoading, fetcher };
}
