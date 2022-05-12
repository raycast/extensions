import { ActionPanel, Image, List } from "@raycast/api";
import { Tweet } from "../lib/twitter";
import { Fetcher } from "../lib/twitterapi_v2";
import { compactNumberFormat, padStart } from "../lib/utils";
import {
  DeleteTweetAction as DeleteTweetAction,
  LikeTweetAction,
  LogoutAction,
  OpenTweetInBrowerAction,
  ReplyTweetAction,
  RetweetAction,
  ShowDetailV2Action,
  UnlikeTweetAction,
} from "./actions";
import { getMarkdownFromTweet } from "./detail";

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

  const maxLength = 70;
  const textRaw = t.text ? t.text.trim() : "";
  const text = textRaw.slice(0, maxLength) + (textRaw.length > maxLength ? " ..." : "");

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
      detail={withDetail ? <List.Item.Detail markdown={getMarkdownFromTweet(t)} /> : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <ShowDetailV2Action tweet={t} />
            <OpenTweetInBrowerAction tweet={t} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <LikeTweetAction tweet={t} />
            <UnlikeTweetAction tweet={t} />
            <ReplyTweetAction tweet={t} />
            <RetweetAction tweet={t} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Destructive">
            <DeleteTweetAction tweet={t} />
          </ActionPanel.Section>
          <ActionPanel.Section>
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
