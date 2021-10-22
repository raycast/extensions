import { ActionPanel, Detail, Image, ImageMask, List, OpenInBrowserAction, showToast, ToastStyle } from "@raycast/api";
import { TweetV1 } from "twitter-api-v2";
import { Fetcher, getPhotoUrlFromTweet, refreshTweet, useRefresher } from "../twitterapi";
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

export function TweetListItem(props: { tweet: TweetV1; fetcher?: Fetcher }) {
  const t = props.tweet;
  const fetcher = props.fetcher;

  const maxLength = 70;
  const textRaw = t.full_text ? t.full_text.trim() : "";
  const text = textRaw.slice(0, maxLength) + (textRaw.length > maxLength ? " ..." : "");

  const imgUrl = t.user.profile_image_url_https;
  const icon: Image | undefined = imgUrl
    ? { source: t.user.profile_image_url_https, mask: ImageMask.Circle }
    : undefined;

  const ownFavoriteCount = t.favorited && textRaw.startsWith("RT @") ? 1 : 0;

  const hasImage = getPhotoUrlFromTweet(t) ? true : false;
  let states = [`💬 ${t.reply_count || 0}`, `🔁 ${t.retweet_count}`, `❤️ ${t.favorite_count + ownFavoriteCount}`];
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
