import { Action, ActionPanel, Detail, Keyboard, showToast, Toast } from "@raycast/api";
import { ReactElement, useEffect } from "react";
import { Tweet } from "../lib/twitter";
import { clientV2, Fetcher, useRefresher } from "../lib/twitterapi_v2";
import {
  DeleteTweetAction,
  BookmarkTweetAction,
  LikeTweetAction,
  OpenTweetInBrowerAction,
  OpenUserProfileInBrowserAction,
  ReplyTweetAction,
  QuoteTweetAction,
  RetweetAction,
  SetReplyHiddenAction,
  ShowPostEngagementAction,
  ShowAuthorTweetsAction,
  UnlikeTweetAction,
} from "./actions";

function isRetweet(tweet: Tweet): boolean {
  if (tweet.text && tweet.text.startsWith("RT @")) {
    return true;
  }
  return false;
}

function getCleanTweetText(tweet: Tweet): string | undefined {
  if (tweet.text === undefined) {
    return undefined;
  }
  if (isRetweet(tweet)) {
    const i = tweet.text.indexOf(":");
    if (i !== undefined && i > 0) {
      return tweet.text.substring(i + 1).trimStart();
    }
  }
  return tweet.text;
}

export function getMarkdownFromTweet(tweet: Tweet, withMeta: boolean): string {
  const t = tweet;
  const retweetedText = isRetweet(t) ? " reposted" : "";

  const parts = [`## ${t.user.name} \`@${t.user.username}\`${retweetedText}`, getCleanTweetText(t) || ""];
  if (t.image_url) {
    parts.push(`![${t.image_url}](${t.image_url})`);
  }
  if (withMeta) {
    if (t.created_at) {
      parts.push(`\`${new Date(t.created_at).toLocaleString()}\``);
    }
    parts.push(
      `Replies: ${t.reply_count || 0} · Reposts: ${t.retweet_count} · Likes: ${t.like_count} · Quotes: ${t.quote_count ?? 0} · Bookmarks: ${t.bookmark_count ?? 0} · Impressions: ${t.impression_count ?? 0}`,
    );
  }
  const md = parts.join("\n\n");
  return md;
}

function TweetRefreshAction(props: { tweet: Tweet; fetcher: Fetcher }): ReactElement {
  const handle = async () => {
    await props.fetcher.updateInline();
  };
  return <Action title="Refresh Post" shortcut={Keyboard.Shortcut.Common.Refresh} onAction={handle} />;
}

export function TweetDetail(props: { tweet: Tweet; fetcher?: Fetcher }) {
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
  useEffect(() => {
    if (error) showToast({ style: Toast.Style.Failure, title: "Could not refresh post", message: error });
  }, [error]);
  const t = data || tweet;
  const md = getMarkdownFromTweet(t, true);
  return (
    <Detail
      isLoading={isLoading}
      markdown={md}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Post">
            <ReplyTweetAction tweet={t} />
            <QuoteTweetAction tweet={t} />
            <OpenTweetInBrowerAction tweet={t} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <LikeTweetAction tweet={t} />
            <UnlikeTweetAction tweet={t} />
            <RetweetAction tweet={t} />
            <BookmarkTweetAction tweet={t} fetcher={props.fetcher} />
            <BookmarkTweetAction tweet={t} remove fetcher={props.fetcher} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Engagement">
            <ShowPostEngagementAction tweet={t} kind="likes" />
            <ShowPostEngagementAction tweet={t} kind="reposts" />
            <ShowPostEngagementAction tweet={t} kind="quotes" />
          </ActionPanel.Section>
          <ActionPanel.Section title="Moderation">
            <SetReplyHiddenAction tweet={t} hidden />
            <SetReplyHiddenAction tweet={t} hidden={false} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Author">
            <ShowAuthorTweetsAction tweet={t} />
            <OpenUserProfileInBrowserAction user={t.user} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Update">
            <TweetRefreshAction tweet={t} fetcher={fetcher} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Destructive">
            <DeleteTweetAction tweet={t} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
