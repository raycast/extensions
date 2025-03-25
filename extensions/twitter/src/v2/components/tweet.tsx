import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { ReactElement, useState } from "react";
import { Tweet } from "../lib/twitter";
import { Fetcher } from "../lib/twitterapi_v2";
import { compactNumberFormat, padStart, replaceAll } from "../../utils";
import {
  DeleteTweetAction as DeleteTweetAction,
  LikeTweetAction,
  LogoutAction,
  OpenTweetInBrowerAction,
  OpenUserProfileInBrowserAction,
  RefreshExistingTweetsAction,
  RefreshTweetsAction,
  ReplyTweetAction,
  RetweetAction,
  ShowAuthorTweetsAction,
  ShowDetailV2Action,
  UnlikeTweetAction,
} from "./actions";
import { getMarkdownFromTweet } from "./detail";

function TweetListItemLikesLabel(props: { tweet: Tweet }): ReactElement | null {
  const t = props.tweet;
  return <List.Item.Detail.Metadata.Label title="Likes" text={`❤️ ${t.like_count}`} />;
}

function TweetListItemRetweetsLabel(props: { tweet: Tweet }): ReactElement | null {
  const t = props.tweet;
  return <List.Item.Detail.Metadata.Label title="Retweets" text={`🔁 ${t.retweet_count}`} />;
}

function TweetListItemRepliesLabel(props: { tweet: Tweet }): ReactElement | null {
  const t = props.tweet;
  return <List.Item.Detail.Metadata.Label title="Replies" text={`💬 ${t.reply_count || 0}`} />;
}

function TweetListItemCreatedAtLabel(props: { tweet: Tweet }): ReactElement | null {
  const t = props.tweet;
  if (!t.created_at) {
    return null;
  }
  return <List.Item.Detail.Metadata.Label title="Tweeted" text={`${new Date(t.created_at).toLocaleString()}`} />;
}

function TweetListItemImpressionLabel(props: { tweet: Tweet }): ReactElement | null {
  const m = props.tweet.non_public_metrics;
  if (!m) {
    return null;
  }
  return <List.Item.Detail.Metadata.Label title="Impressions" text={`👁️ ${m.impression_count}`} />;
}

function TweetListItemProfileClicksLabel(props: { tweet: Tweet }): ReactElement | null {
  const m = props.tweet.organic_metrics;
  if (!m || m.user_profile_clicks === undefined) {
    return null;
  }
  return <List.Item.Detail.Metadata.Label title="User Profile Clicks" text={`👤 ${m.user_profile_clicks}`} />;
}

function TweetListItemUrlClicksLabel(props: { tweet: Tweet }): ReactElement | null {
  const m = props.tweet.non_public_metrics;
  if (!m || m.url_link_clicks === undefined) {
    return null;
  }
  return <List.Item.Detail.Metadata.Label title="Url Clicks" text={`🔗 ${m.url_link_clicks}`} />;
}

function TweetListItemShowMetaToggleAction(props: {
  showMeta: boolean;
  onStateChange: (val: boolean) => void;
}): ReactElement {
  const show = props.showMeta;
  return (
    <Action
      title={show ? "Hide Details" : "Show Details"}
      shortcut={{ modifiers: ["opt"], key: "d" }}
      icon={show ? Icon.EyeDisabled : Icon.Eye}
      onAction={() => props.onStateChange(!props.showMeta)}
    />
  );
}

function TweetListItemDetailMeta(props: { tweet: Tweet }): ReactElement {
  const t = props.tweet;
  return (
    <List.Item.Detail.Metadata>
      <TweetListItemCreatedAtLabel tweet={t} />
      <TweetListItemLikesLabel tweet={t} />
      <TweetListItemRetweetsLabel tweet={t} />
      <TweetListItemRepliesLabel tweet={t} />
      <TweetListItemImpressionLabel tweet={t} />
      <TweetListItemProfileClicksLabel tweet={t} />
      <TweetListItemUrlClicksLabel tweet={t} />
    </List.Item.Detail.Metadata>
  );
}

function getCleanTweetText(tweet: Tweet): string {
  const textRaw = tweet.text ? tweet.text.trim() : "";
  let text = replaceAll(textRaw, /\n/g, " ");
  text = replaceAll(text, /&amp/g, " "); // &amp seems to break string operations in node
  return text;
}

export function TweetListItem(props: {
  tweet: Tweet;
  fetcher?: Fetcher;
  maxRTDigits?: number;
  maxCommentDigits?: number;
  maxFavDigits?: number;
  millifyState?: boolean;
  withDetail?: boolean;
}) {
  const t = props.tweet;
  const withDetail = props.withDetail;
  const fetcher = props.fetcher;
  const millifyState = props.millifyState !== undefined ? props.millifyState : true;
  const [showMeta, setShowMeta] = useState<boolean>(true);

  const text = getCleanTweetText(t);

  const imgUrl = t.user.profile_image_url;
  const icon: Image.ImageLike | undefined = imgUrl ? { source: imgUrl, mask: Image.Mask.Circle } : undefined;

  const hasImage = t.image_url ? true : false;
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
    `❤️ ${p(t.like_count, maxFavDigits)}`,
  ];

  if (hasImage) {
    states = ["🖼️", ...states];
  }

  const accessories: List.Item.Accessory[] = [{ text: states.join("  ") }];

  return (
    <List.Item
      id={t.id}
      key={t.id}
      title={text}
      icon={icon}
      accessories={!withDetail ? accessories : undefined}
      detail={
        withDetail ? (
          <List.Item.Detail
            markdown={getMarkdownFromTweet(t, !showMeta)}
            metadata={showMeta ? <TweetListItemDetailMeta tweet={t} /> : null}
          />
        ) : undefined
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <ShowDetailV2Action tweet={t} />
            <OpenTweetInBrowerAction tweet={t} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <LikeTweetAction tweet={t} fetcher={fetcher} />
            <UnlikeTweetAction tweet={t} fetcher={fetcher} />
            <ReplyTweetAction tweet={t} />
            <RetweetAction tweet={t} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ShowAuthorTweetsAction tweet={t} />
            <OpenUserProfileInBrowserAction user={t.user} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Destructive">
            <DeleteTweetAction tweet={t} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Update">
            <RefreshExistingTweetsAction fetcher={fetcher} />
            <RefreshTweetsAction fetcher={fetcher} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <TweetListItemShowMetaToggleAction showMeta={showMeta} onStateChange={setShowMeta} />
            <LogoutAction />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function TweetList(props: {
  tweets: Tweet[] | undefined;
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
      const lenF = getStringLength(t.like_count);
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
    <List isLoading={props.isLoading} searchBarPlaceholder="Filter Tweets by name..." isShowingDetail>
      {tweets?.map((tweet) => (
        <TweetListItem
          key={tweet.id}
          tweet={tweet}
          fetcher={props.fetcher}
          maxCommentDigits={maxCDigits}
          maxFavDigits={maxFavDigits}
          maxRTDigits={maxRTDigits}
          millifyState={millifyState}
          withDetail
        />
      ))}
    </List>
  );
}
