import { List, showToast, ToastStyle } from "@raycast/api";
import { useState, useEffect } from "react";
import { TweetV1 } from "twitter-api-v2";
import { TweetListItem } from "../components/tweet";
import { loggedInUserAccount, twitterClient } from "../twitterapi";

export default function MyTweetList() {
  const { data, error, isLoading } = useSearch("");
  if (error) {
    showToast(ToastStyle.Failure, "Error", error);
  }
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter My Tweets by name...">
      {data?.map((tweet) => (
        <TweetListItem key={tweet.id_str} tweet={tweet} />
      ))}
    </List>
  );
}

export function useSearch(query: string | undefined): {
  data: TweetV1[] | undefined;
  error?: string;
  isLoading: boolean;
} {
  const [data, setData] = useState<TweetV1[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      if (query === null || cancel) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const account = await loggedInUserAccount();
        const mytweets = await twitterClient.v1.userTimelineByUsername(account.screen_name);
        let tweets: TweetV1[] = [];
        for (const t of mytweets.tweets) {
          tweets.push(t);
        }
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

    fetchData();

    return () => {
      cancel = true;
    };
  }, []);

  return { data, error, isLoading };
}
