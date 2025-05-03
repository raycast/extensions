import { useEffect, useState } from "react";
import {
  TTweetv2Expansion,
  TTweetv2MediaField,
  TTweetv2TweetField,
  TweetHomeTimelineV2Paginator,
  TweetUserTimelineV2Paginator,
  TweetV2,
  TwitterApi,
  TwitterV2IncludesHelper,
  UserV2,
} from "twitter-api-v2";
import { authorize, getOAuthTokens } from "./oauth";
import { Tweet, TweetNonPublicMetrics, TweetOrganicMetrics, User } from "./twitter";
import { getErrorMessage } from "../../utils";

const max_results = 20;

const defaultFields: TTweetv2TweetField[] = [
  "public_metrics",
  "author_id",
  "attachments",
  "created_at",
  "id",
  "entities",
  "conversation_id",
];

const defaultExpansions: TTweetv2Expansion[] = [
  "attachments.media_keys",
  "author_id",
  "in_reply_to_user_id",
  "entities.mentions.username",
  "referenced_tweets.id",
];

const defaultMediaFields: TTweetv2MediaField[] = ["url", "type", "media_key", "preview_image_url"];

function twitterUserToUser(result: UserV2): User {
  const u: User = {
    id: result.id,
    name: result.name,
    username: result.username,
    profile_image_url: result.profile_image_url,
  };
  return u;
}

export class ClientV2 {
  private userCache: Record<string, User> = {};
  private meCache: User | undefined;

  async getAPI(): Promise<TwitterApi> {
    await authorize();
    const tokens = await getOAuthTokens();
    const at = tokens?.accessToken;
    const c = new TwitterApi(at || "");
    return c;
  }

  async getUserAccount(userId: string): Promise<User> {
    if (userId in this.userCache) {
      return this.userCache[userId];
    }
    const api = await this.getAPI();
    const r = await api.v2.user(userId, { "user.fields": ["profile_image_url"] });
    const u = twitterUserToUser(r.data);
    this.userCache[userId] = u;
    return u;
  }

  async prefetchUserAccounts(tweetsRaw: TweetUserTimelineV2Paginator | TweetHomeTimelineV2Paginator): Promise<void> {
    const userIDs: string[] = [];
    for (const t of tweetsRaw) {
      if (t.author_id && !(t.author_id in this.userCache)) {
        userIDs.push(t.author_id);
      }
    }
    if (userIDs.length > 0) {
      const api = await this.getAPI();
      const usersRaw = await api.v2.users(userIDs, { "user.fields": ["profile_image_url"] });
      for (const ru of usersRaw.data) {
        const u = twitterUserToUser(ru);
        this.userCache[u.id] = u;
      }
    }
  }

  async me(): Promise<User> {
    if (this.meCache) {
      return this.meCache;
    }
    const api = await this.getAPI();
    const me = await api.v2.me();
    const u: User = {
      id: me.data.id,
      name: me.data.name,
      username: me.data.username,
      profile_image_url: me.data.profile_image_url,
    };
    this.meCache = u;
    return u;
  }

  async getMyTweets(): Promise<Tweet[]> {
    const api = await this.getAPI();
    const me = await api.v2.me();
    return await this.getTweetsFromAuthor(me.data.id, ["non_public_metrics", "organic_metrics"]);
  }

  async getTweetsFromAuthor(authorID: string, extraFields?: TTweetv2TweetField[]): Promise<Tweet[]> {
    const api = await this.getAPI();
    const fields = [...defaultFields];
    if (extraFields) {
      fields.push(...extraFields);
    }
    const tweetsRaw = await api.v2.userTimeline(authorID, {
      max_results: max_results,
      "tweet.fields": fields,
      "media.fields": defaultMediaFields,
      expansions: defaultExpansions,
    });
    const includes = new TwitterV2IncludesHelper(tweetsRaw);
    const tweets: Tweet[] = [];
    await this.prefetchUserAccounts(tweetsRaw);
    for (const t of tweetsRaw) {
      tweets.push(await this.tweetV2ToTweet(t, includes));
    }
    return tweets;
  }

  private async tweetV2ToTweet(tweet: TweetV2, includes: TwitterV2IncludesHelper): Promise<Tweet> {
    const t = tweet;
    const media = includes.medias(t);
    let non_public_metrics: TweetNonPublicMetrics | undefined;
    if (t.non_public_metrics) {
      non_public_metrics = {
        impression_count: t.non_public_metrics.impression_count,
        url_link_clicks: t.non_public_metrics.url_link_clicks,
      };
    }
    let organic_metrics: TweetOrganicMetrics | undefined;
    if (t.organic_metrics) {
      organic_metrics = {
        impression_count: t.organic_metrics.impression_count,
        url_link_clicks: t.organic_metrics.url_link_clicks,
        user_profile_clicks: t.organic_metrics.user_profile_clicks,
        retweet_count: t.organic_metrics.retweet_count,
        reply_count: t.organic_metrics.reply_count,
        like_count: t.organic_metrics.like_count,
      };
    }
    let image_url: string | undefined = undefined;
    if (media && media.length > 0) {
      const m = media[0];
      if (m.type === "animated_gif" || m.type === "video") {
        image_url = m.preview_image_url;
      } else {
        image_url = m.url;
      }
    }
    if (!t.author_id) {
      throw Error("No author ID");
    }
    const nt: Tweet = {
      id: t.id,
      text: t.text,
      created_at: t.created_at,
      conversation_id: t.conversation_id,
      source: t.source || "",
      image_url: image_url,
      user: await this.getUserAccount(t.author_id),
      quote_count: t.public_metrics?.quote_count || 0,
      reply_count: t.public_metrics?.reply_count || 0,
      retweet_count: t.public_metrics?.retweet_count || 0,
      like_count: t.public_metrics?.like_count || 0,
      non_public_metrics: non_public_metrics,
      organic_metrics: organic_metrics,
    };
    return nt;
  }

  async refreshTweets(tweets: Tweet[] | undefined): Promise<Tweet[] | undefined> {
    if (tweets === undefined) {
      return undefined;
    }
    const containsNonPublicMetrics = (): boolean => {
      return tweets.length === tweets.filter((t) => t.non_public_metrics !== undefined).length;
    };
    const containsOrganicMetrics = (): boolean => {
      return tweets.length === tweets.filter((t) => t.organic_metrics !== undefined).length;
    };
    const api = await this.getAPI();
    const tweetIds = tweets.map((t) => t.id);
    const fields = [...defaultFields];
    if (containsNonPublicMetrics()) {
      fields.push("non_public_metrics");
    }
    if (containsOrganicMetrics()) {
      fields.push("organic_metrics");
    }
    const tweetsRaw = await api.v2.tweets(tweetIds, {
      "tweet.fields": fields,
      "media.fields": defaultMediaFields,
      expansions: defaultExpansions,
    });
    const includes = new TwitterV2IncludesHelper(tweetsRaw);
    const nts = await Promise.all(
      tweetsRaw.data.map(async (t) => {
        return await this.tweetV2ToTweet(t, includes);
      }),
    );
    return nts;
  }

  async sendTweet(text: string): Promise<void> {
    const api = await this.getAPI();
    await api.v2.tweet(text);
  }

  async sendThread(texts: string[]): Promise<void> {
    const api = await this.getAPI();
    await api.v2.tweetThread(texts);
  }

  async replyTweetID(text: string, tweetID: string): Promise<void> {
    const api = await this.getAPI();
    await api.v2.reply(text, tweetID);
  }
  async replyTweet(text: string, tweet: Tweet): Promise<void> {
    await this.replyTweetID(text, tweet.id);
  }

  async retweet(tweet: Tweet): Promise<void> {
    const api = await this.getAPI();
    const me = await this.me();
    await api.v2.retweet(me.id, tweet.id);
  }

  async deleteTweetID(tweetID: string): Promise<void> {
    const api = await this.getAPI();
    await api.v2.deleteTweet(tweetID);
  }
  async deleteTweet(tweet: Tweet): Promise<void> {
    await this.deleteTweetID(tweet.id);
  }

  async likeTweet(tweet: Tweet): Promise<void> {
    const api = await this.getAPI();
    const me = await this.me();
    api.v2.like(me.id, tweet.id);
  }

  async unlikeTweet(tweet: Tweet): Promise<void> {
    const api = await this.getAPI();
    const me = await this.me();
    api.v2.unlike(me.id, tweet.id);
  }

  async homeTimeline(): Promise<Tweet[] | undefined> {
    const api = await this.getAPI();
    const tweetsRaw = await api.v2.homeTimeline({
      exclude: "replies",
      max_results: max_results,
      "tweet.fields": ["public_metrics", "author_id", "attachments", "created_at", "id", "entities", "conversation_id"],
      "media.fields": ["url", "type", "media_key", "preview_image_url"],
      expansions: [
        "attachments.media_keys",
        "author_id",
        "in_reply_to_user_id",
        "entities.mentions.username",
        "referenced_tweets.id",
      ],
    });
    const includes = new TwitterV2IncludesHelper(tweetsRaw);
    const tweets: Tweet[] = [];
    await this.prefetchUserAccounts(tweetsRaw);
    for (const t of tweetsRaw) {
      const media = includes.medias(t);
      let image_url: string | undefined = undefined;
      if (media && media.length > 0) {
        const m = media[0];
        if (m.type === "animated_gif" || m.type === "video") {
          image_url = m.preview_image_url;
        } else {
          image_url = m.url;
        }
      }
      if (!t.author_id) {
        continue;
      }
      const nt: Tweet = {
        id: t.id,
        text: t.text,
        created_at: t.created_at,
        conversation_id: t.conversation_id,
        source: t.source || "",
        image_url: image_url,
        user: await this.getUserAccount(t.author_id),
        quote_count: t.public_metrics?.quote_count || 0,
        reply_count: t.public_metrics?.reply_count || 0,
        retweet_count: t.public_metrics?.retweet_count || 0,
        like_count: t.public_metrics?.like_count || 0,
      };
      tweets.push(nt);
    }
    return tweets;
  }
}

export function createClientV2(): ClientV2 {
  return new ClientV2();
}

export const clientV2 = createClientV2();

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
