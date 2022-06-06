import { ActionPanel, Detail, showToast, Toast } from "@raycast/api";
import { Tweet } from "../lib/twitter";
import { clientV2, useRefresher } from "../lib/twitterapi_v2";
import {
  DeleteTweetAction,
  LikeTweetAction,
  OpenTweetInBrowerAction,
  OpenUserProfileInBrowserAction,
  ReplyTweetAction,
  RetweetAction,
  ShowAuthorTweetsAction,
  UnlikeTweetAction,
} from "./actions";

export function getMarkdownFromTweet(tweet: Tweet, withMeta: boolean): string {
  const t = tweet;

  const parts = [`## ${t.user.name} \`@${t.user.username}\``, t.text || ""];
  if (t.image_url) {
    parts.push(`![${t.image_url}](${t.image_url})`);
  }
  if (withMeta) {
    if (t.created_at) {
      parts.push(`\`${new Date(t.created_at).toLocaleString()}\``);
    }
    const states = [`💬 ${t.reply_count || 0}`, `🔁 ${t.retweet_count}`, `❤️ ${t.like_count}`];
    parts.push(states.join("   "));
  }
  const md = parts.join("\n\n");
  return md;
}

export function TweetDetail(props: { tweet: Tweet }) {
  const tweet = props.tweet;
  const { data, error, isLoading, fetcher } = useRefresher<Tweet | undefined>(async (): Promise<Tweet | undefined> => {
    if (data === undefined) {
      return props.tweet;
    } else {
      const rd = await clientV2.refreshTweets([data]);
      if (rd && rd.length > 0) {
        return rd[0];
      }
    }
  });
  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: error });
  }
  const t = data || tweet;
  const md = getMarkdownFromTweet(t, true);
  return (
    <Detail
      isLoading={isLoading}
      markdown={md}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Tweet">
            <ReplyTweetAction tweet={t} />
            <OpenTweetInBrowerAction tweet={t} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <LikeTweetAction tweet={t} />
            <UnlikeTweetAction tweet={t} />
            <RetweetAction tweet={t} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Author">
            <ShowAuthorTweetsAction tweet={t} />
            <OpenUserProfileInBrowserAction user={t.user} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Destructive">
            <DeleteTweetAction tweet={t} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      /*actions={
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
      }*/
    />
  );
}
