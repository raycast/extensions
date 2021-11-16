import { ActionPanel, Detail, Image, ImageMask, List, OpenInBrowserAction, showToast, ToastStyle } from "@raycast/api";
import { TweetV1 } from "twitter-api-v2";
import { Fetcher, getPhotoUrlFromTweet, refreshTweet, useRefresher } from "../twitterapi";
import { compactNumberFormat, padStart } from "../utils";
import {
  DeleteTweetAction,
  LikeAction,
  OpenAuthorProfileAction,
  RefreshAction,
  RefreshInlineAction,
  ReplyTweetAction,
  RetweetAction,
  ShowTweetAction,
  ShowUserTweetsAction,
} from "./tweet_actions";

function getTweetUrl(tweet: TweetV1): string {
  return `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`;
}

export function TweetListItem(props: {
  tweet: TweetV1;
  fetcher?: Fetcher;
  maxRTDigits?: number;
  maxCommentDigits?: number;
  maxFavDigits?: number;
  millifyState?: boolean;
}) {
  const t = props.tweet;
  const fetcher = props.fetcher;
  const millifyState = props.millifyState !== undefined ? props.millifyState : true;

  const maxLength = 70;
  const textRaw = t.full_text ? t.full_text.trim() : "";
  const text = textRaw.slice(0, maxLength) + (textRaw.length > maxLength ? " ..." : "");

  const imgUrl = t.user.profile_image_url_https;
  const icon: Image | undefined = imgUrl
    ? { source: t.user.profile_image_url_https, mask: ImageMask.Circle }
    : undefined;

  const ownFavoriteCount = t.favorited && textRaw.startsWith("RT @") ? 1 : 0;

  const hasImage = getPhotoUrlFromTweet(t) ? true : false;
  const p = (num: number | undefined, length: number): string => {
    if (num === undefined) {
      return "0";
    }
    const text = millifyState ? compactNumberFormat(num) : `${num}`;
    return padStart(text, length);
  };
  const minPadding = 1;
  const maxPadding = 3;
  const calcPadding = (num: number | undefined): number => {
    if (num === undefined) {
      return minPadding;
    }
    if (num < minPadding) {
      return minPadding;
    }
    if (num > maxPadding) {
      return maxPadding;
    }
    return num;
  };
  const maxReplyDigits = calcPadding(props.maxCommentDigits);
  const maxRTDigits = calcPadding(props.maxRTDigits);
  const maxFavDigits = calcPadding(props.maxFavDigits);
  let states = [
    `💬 ${p(t.reply_count || 0, maxReplyDigits)}`,
    `🔁 ${p(t.retweet_count, maxRTDigits)}`,
    `❤️ ${p(t.favorite_count + ownFavoriteCount, maxFavDigits)}`,
  ];
  if (hasImage) {
    states = ["🖼️", ...states];
  }

  return (
    <List.Item
      id={t.id_str}
      key={t.id_str}
      title={text}
      icon={icon}
      accessoryTitle={states.join("  ")}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Tweet">
            <ShowTweetAction tweet={t} />
            <OpenInBrowserAction url={getTweetUrl(t)} shortcut={{ modifiers: ["cmd"], key: "b" }} />
            <LikeAction tweet={t} fetcher={fetcher} />
            <ReplyTweetAction tweet={t} />
            <RetweetAction tweet={t} fetcher={fetcher} />
            <ShowUserTweetsAction username={t.user.screen_name} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Info">
            <OpenAuthorProfileAction tweet={t} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Destructive">
            <DeleteTweetAction tweet={t} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Update">
            <RefreshInlineAction fetcher={fetcher} />
            <RefreshAction fetcher={fetcher} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function TweetDetail(props: { tweet: TweetV1 }) {
  const { data, error, isLoading, fetcher } = useRefresher<TweetV1 | undefined>(
    async (): Promise<TweetV1 | undefined> => {
      if (data === undefined) {
        return props.tweet;
      } else {
        return await refreshTweet(data);
      }
    }
  );
  if (error) {
    showToast(ToastStyle.Failure, "Error", error);
  }
  const t = data || props.tweet;
  const ownFavoriteCount = t.favorited && t.full_text && t.full_text.startsWith("RT @") ? 1 : 0;
  const states = [`💬 ${t.reply_count || 0}`, `🔁 ${t.retweet_count}`, `❤️ ${t.favorite_count + ownFavoriteCount}`];
  const imgUrl = getPhotoUrlFromTweet(t);
  const parts = [`## ${t.user.name} \`@${t.user.screen_name}\``, t.full_text || "", `\`${t.created_at}\``];
  if (imgUrl) {
    parts.push(`![${imgUrl}](${imgUrl})`);
  }
  parts.push(states.join("   "));
  const md = parts.join("\n\n");
  return (
    <Detail
      isLoading={isLoading}
      markdown={md}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Tweet">
            <ReplyTweetAction tweet={t} />
            <LikeAction tweet={t} fetcher={fetcher} />
            <RetweetAction tweet={t} fetcher={fetcher} />
            <ShowUserTweetsAction username={t.user.screen_name} />
            <OpenInBrowserAction url={getTweetUrl(t)} shortcut={{ modifiers: ["cmd"], key: "b" }} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Info">
            <OpenAuthorProfileAction tweet={t} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Destructive">
            <DeleteTweetAction tweet={t} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Update">
            <RefreshAction title="Refresh Tweet" fetcher={fetcher} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function TweetList(props: {
  tweets: TweetV1[] | undefined;
  isLoading?: boolean | undefined;
  fetcher?: Fetcher | undefined;
  millifyState?: boolean;
}) {
  const tweets = props.tweets;
  const millifyState = props.millifyState !== undefined ? props.millifyState : true;
  let maxFavDigits = 1;
  let maxRTDigits = 1;
  let maxCDigits = 1;
  const getStringLength = (num: number | undefined): number => {
    if (num === undefined) {
      return 0;
    }
    const text = millifyState ? compactNumberFormat(num) : `${num}`;
    return text.length;
  };

  if (tweets) {
    for (const t of tweets) {
      const lenF = getStringLength(t.favorite_count);
      if (lenF > maxFavDigits) {
        maxFavDigits = lenF;
      }
      const lenRT = getStringLength(t.retweet_count);
      if (lenRT > maxRTDigits) {
        maxRTDigits = lenRT;
      }
      const lenC = getStringLength(t.reply_count);
      if (lenC > maxCDigits) {
        maxCDigits = lenC;
      }
    }
  }
  return (
    <List isLoading={props.isLoading} searchBarPlaceholder="Filter Tweets by name...">
      {tweets?.map((tweet) => (
        <TweetListItem
          key={tweet.id_str}
          tweet={tweet}
          fetcher={props.fetcher}
          maxCommentDigits={maxCDigits}
          maxFavDigits={maxFavDigits}
          maxRTDigits={maxRTDigits}
          millifyState={millifyState}
        />
      ))}
    </List>
  );
}
