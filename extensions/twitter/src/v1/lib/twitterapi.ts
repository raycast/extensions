import { getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { AccountSettingsV1, TweetV1, TwitterApi } from "twitter-api-v2";
import { getErrorMessage } from "../../utils";

function createClient(): TwitterApi {
  const pref = getPreferenceValues();
  const appKey = (pref.appkey as string) || "";
  const appSecret = (pref.appsecret as string) || "";
  const accessToken = (pref.accesstoken as string) || "";
  const accessSecret = (pref.accesssecret as string) || "";
  const client = new TwitterApi({
    appKey: appKey,
    appSecret: appSecret,
    accessToken: accessToken,
    accessSecret: accessSecret,
  });
  return client;
}

let _twitterClient: TwitterApi | null = null;

export function twitterClient(): TwitterApi {
  if (!_twitterClient) {
    _twitterClient = createClient();
  }
  return _twitterClient;
}

let activeAccount: AccountSettingsV1 | undefined;

export async function loggedInUserAccount(): Promise<AccountSettingsV1> {
  if (!activeAccount) {
    const account = await twitterClient().v1.accountSettings();
    activeAccount = account;
  }
  return activeAccount;
}

export async function refreshTweets(tweets?: TweetV1[]): Promise<TweetV1[] | undefined> {
  if (tweets) {
    const tweetIds = tweets.map((t) => t.id_str);
    const unorderedFreshTweets = await twitterClient().v1.tweets(tweetIds);

    const freshTweets: TweetV1[] = [];
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

export async function refreshTweet(tweet: TweetV1): Promise<TweetV1 | undefined> {
  const tweets = await refreshTweets([tweet]);
  if (tweets && tweets.length === 1) {
    return tweets[0];
  }
  return undefined;
}

export interface Fetcher {
  updateInline: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useRefresher<T>(
  fn: (updateInline: boolean) => Promise<T>,
  deps?: React.DependencyList | undefined,
): {
  data: T | undefined;
  error?: string;
  isLoading: boolean;
  fetcher: Fetcher;
} {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [timestamp, setTimestamp] = useState<Date>(new Date());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const depsAll: any[] = [timestamp];
  if (deps) {
    for (const d of deps) {
      depsAll.push(d);
    }
  }
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
      const data = await fn(updateInline);
      if (!cancel) {
        setData(data);
      }
    } catch (e) {
      if (!cancel) {
        setError(getErrorMessage(e));
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
  }, depsAll);

  return { data, error, isLoading, fetcher };
}

export function getPhotoUrlFromTweet(tweet: TweetV1): string | undefined {
  const media = tweet.entities.media;
  if (media) {
    for (const m of media) {
      if (m.type === "photo" && m.media_url_https) {
        return m.media_url_https;
      }
    }
  }
  return undefined;
}
