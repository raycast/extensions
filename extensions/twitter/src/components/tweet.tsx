import { ActionPanel, Detail, Image, ImageMask, List, OpenInBrowserAction, PushAction } from "@raycast/api";
import { TweetV1 } from "twitter-api-v2";
import { ReplyTweetAction } from "./tweet_actions";

function getTweetUrl(tweet: TweetV1): string {
  return `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`;
}

export function TweetListItem(props: { tweet: TweetV1 }) {
  const t = props.tweet;

  const maxLength = 70;
  const textRaw = t.full_text ? t.full_text.trim() : "";
  const text = textRaw.slice(0, maxLength) + (textRaw.length > maxLength ? " ..." : "");

  const imgUrl = t.user.profile_image_url_https;
  const icon: Image | undefined = imgUrl
    ? { source: t.user.profile_image_url_https, mask: ImageMask.Circle }
    : undefined;

  const urls = t.entities.urls;
  const hasImage = urls && urls.length > 0;
  let states = [`💬 ${t.reply_count || 0}`, `🔁 ${t.retweet_count}`, `❤️ ${t.favorite_count}`];
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
          <PushAction title="Show Tweet" target={<TweetDetail tweet={t} />} />
          <ReplyTweetAction tweet={t} />
          <OpenInBrowserAction url={getTweetUrl(t)} />
        </ActionPanel>
      }
    />
  );
}

export function TweetDetail(props: { tweet: TweetV1 }) {
  const t = props.tweet;
  const states = [`💬 ${t.reply_count || 0}`, `🔁 ${t.retweet_count}`, `❤️ ${t.favorite_count}`];
  const urls = t.entities.urls;
  const imgUrl = urls && urls.length > 0 ? urls[0].url : undefined;
  let parts = [t.full_text || ""];
  if (imgUrl) {
    parts.push(`[${imgUrl}](${imgUrl})`);
  }
  parts.push(states.join("   "));
  const md = parts.join("\n\n");
  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={getTweetUrl(t)} />
          <ReplyTweetAction tweet={t} />
        </ActionPanel>
      }
    />
  );
}
