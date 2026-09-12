import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ReactElement, useState } from "react";
import { shouldShowListWithDetails } from "../../common";
import { deduplicateById, Tweet } from "../lib/twitter";
import { clientV2, Fetcher } from "../lib/twitterapi_v2";
import { compactNumberFormat, padStart, replaceAll } from "../../utils";
import {
  DeleteTweetAction as DeleteTweetAction,
  BookmarkTweetAction,
  LikeTweetAction,
  LogoutAction,
  OpenTweetInBrowerAction,
  OpenUserProfileInBrowserAction,
  RefreshExistingTweetsAction,
  RefreshTweetsAction,
  ReplyTweetAction,
  RetweetAction,
  QuoteTweetAction,
  SetReplyHiddenAction,
  ShowPostEngagementAction,
  ShowAuthorTweetsAction,
  ShowDetailV2Action,
  UnlikeTweetAction,
} from "./actions";
import { getMarkdownFromTweet } from "./detail";

function TweetListItemLikesLabel(props: { tweet: Tweet }): ReactElement | null {
  const t = props.tweet;
  return <List.Item.Detail.Metadata.Label title="Likes" icon={Icon.Heart} text={`${t.like_count}`} />;
}

function TweetListItemRetweetsLabel(props: { tweet: Tweet }): ReactElement | null {
  const t = props.tweet;
  return <List.Item.Detail.Metadata.Label title="Reposts" icon={Icon.Repeat} text={`${t.retweet_count}`} />;
}

function TweetListItemRepliesLabel(props: { tweet: Tweet }): ReactElement | null {
  const t = props.tweet;
  return <List.Item.Detail.Metadata.Label title="Replies" icon={Icon.SpeechBubble} text={`${t.reply_count || 0}`} />;
}

function TweetListItemQuotesLabel(props: { tweet: Tweet }): ReactElement | null {
  return (
    <List.Item.Detail.Metadata.Label
      title="Quotes"
      icon={Icon.QuotationMarks}
      text={`${props.tweet.quote_count ?? 0}`}
    />
  );
}

function TweetListItemBookmarksLabel(props: { tweet: Tweet }): ReactElement | null {
  return (
    <List.Item.Detail.Metadata.Label
      title="Bookmarks"
      icon={Icon.Bookmark}
      text={`${props.tweet.bookmark_count ?? 0}`}
    />
  );
}

function TweetListItemCreatedAtLabel(props: { tweet: Tweet }): ReactElement | null {
  const t = props.tweet;
  if (!t.created_at) {
    return null;
  }
  return (
    <List.Item.Detail.Metadata.Label
      title="Posted"
      icon={Icon.Calendar}
      text={`${new Date(t.created_at).toLocaleString()}`}
    />
  );
}

function TweetListItemImpressionLabel(props: { tweet: Tweet }): ReactElement | null {
  const m = props.tweet.non_public_metrics;
  if (!m) {
    return null;
  }
  return <List.Item.Detail.Metadata.Label title="Impressions" icon={Icon.Eye} text={`${m.impression_count}`} />;
}

function TweetListItemProfileClicksLabel(props: { tweet: Tweet }): ReactElement | null {
  const m = props.tweet.non_public_metrics ?? props.tweet.organic_metrics;
  if (!m || m.user_profile_clicks === undefined) {
    return null;
  }
  return (
    <List.Item.Detail.Metadata.Label title="User Profile Clicks" icon={Icon.Person} text={`${m.user_profile_clicks}`} />
  );
}

function TweetListItemPublicImpressionsLabel(props: { tweet: Tweet }): ReactElement | null {
  if (props.tweet.non_public_metrics || props.tweet.impression_count === undefined) return null;
  return (
    <List.Item.Detail.Metadata.Label title="Impressions" icon={Icon.Eye} text={`${props.tweet.impression_count}`} />
  );
}

function TweetListItemVideoViewsLabel(props: { tweet: Tweet }): ReactElement | null {
  const views = props.tweet.video_view_count ?? props.tweet.video_playback_count;
  if (views === undefined) return null;
  return <List.Item.Detail.Metadata.Label title="Video Views" icon={Icon.Video} text={`${views}`} />;
}

function TweetListItemUrlClicksLabel(props: { tweet: Tweet }): ReactElement | null {
  const m = props.tweet.non_public_metrics;
  if (!m || m.url_link_clicks === undefined) {
    return null;
  }
  return <List.Item.Detail.Metadata.Label title="URL Clicks" icon={Icon.Link} text={`${m.url_link_clicks}`} />;
}

export function ToggleDetailsAction(props: {
  isShowingDetail: boolean;
  onToggle: (isShowingDetail: boolean) => void;
}): ReactElement {
  return (
    <Action
      title={props.isShowingDetail ? "Hide Details" : "Show Details"}
      shortcut={{ modifiers: ["opt"], key: "d" }}
      icon={props.isShowingDetail ? Icon.AppWindowList : Icon.AppWindowSidebarRight}
      onAction={() => props.onToggle(!props.isShowingDetail)}
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
      <TweetListItemQuotesLabel tweet={t} />
      <TweetListItemBookmarksLabel tweet={t} />
      <TweetListItemImpressionLabel tweet={t} />
      <TweetListItemPublicImpressionsLabel tweet={t} />
      <TweetListItemProfileClicksLabel tweet={t} />
      <TweetListItemUrlClicksLabel tweet={t} />
      <TweetListItemVideoViewsLabel tweet={t} />
    </List.Item.Detail.Metadata>
  );
}

function getCleanTweetText(tweet: Tweet): string {
  const textRaw = tweet.text ? tweet.text.trim() : "";
  let text = replaceAll(textRaw, /\n/g, " ");
  text = replaceAll(text, /&amp/g, " "); // &amp seems to break string operations in node
  return text;
}

export function useModeratableReplyIds(tweets: readonly Tweet[] | undefined): ReadonlySet<string> {
  const replies = (tweets ?? []).filter((tweet) => tweet.conversation_id && tweet.conversation_id !== tweet.id);
  const replyKey = replies.map((tweet) => `${tweet.id}:${tweet.conversation_id}`).join(",");
  const { data } = usePromise(
    async (currentReplyKey: string) => (currentReplyKey ? await clientV2.getModeratableReplyIds(replies) : []),
    [replyKey],
    { execute: replies.length > 0 },
  );
  return replies.length > 0 ? new Set(data ?? []) : new Set();
}

export function TweetListItem(props: {
  tweet: Tweet;
  fetcher?: Fetcher;
  maxRTDigits?: number;
  maxCommentDigits?: number;
  maxFavDigits?: number;
  millifyState?: boolean;
  withDetail?: boolean;
  canModerateReply?: boolean;
  onToggleDetails?: (isShowingDetail: boolean) => void;
}) {
  const t = props.tweet;
  const withDetail = props.withDetail;
  const fetcher = props.fetcher;
  const millifyState = props.millifyState !== undefined ? props.millifyState : true;

  const text = getCleanTweetText(t);

  const imgUrl = t.user.profile_image_url;
  const icon: Image.ImageLike = imgUrl
    ? { source: imgUrl, mask: Image.Mask.Circle, fallback: Icon.Person }
    : Icon.Person;

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

  const accessories: List.Item.Accessory[] = [
    { icon: Icon.SpeechBubble, text: p(t.reply_count || 0, maxReplyDigits), tooltip: "Replies" },
    { icon: Icon.Repeat, text: p(t.retweet_count, maxRTDigits), tooltip: "Reposts" },
    { icon: Icon.Heart, text: p(t.like_count, maxFavDigits), tooltip: "Likes" },
  ];

  if (hasImage) {
    accessories.unshift({ icon: Icon.Image, tooltip: "Contains Media" });
  }

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
            markdown={getMarkdownFromTweet(t, false)}
            metadata={<TweetListItemDetailMeta tweet={t} />}
          />
        ) : undefined
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <ShowDetailV2Action tweet={t} fetcher={fetcher} canModerateReply={props.canModerateReply} />
            <OpenTweetInBrowerAction tweet={t} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <LikeTweetAction tweet={t} fetcher={fetcher} />
            <UnlikeTweetAction tweet={t} fetcher={fetcher} />
            <ReplyTweetAction tweet={t} />
            <QuoteTweetAction tweet={t} />
            <RetweetAction tweet={t} />
            <BookmarkTweetAction tweet={t} fetcher={fetcher} />
            <BookmarkTweetAction tweet={t} remove fetcher={fetcher} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Engagement">
            <ShowPostEngagementAction tweet={t} kind="likes" />
            <ShowPostEngagementAction tweet={t} kind="reposts" />
            <ShowPostEngagementAction tweet={t} kind="quotes" />
          </ActionPanel.Section>
          {props.canModerateReply && (
            <ActionPanel.Section title="Moderation">
              <SetReplyHiddenAction tweet={t} hidden />
              <SetReplyHiddenAction tweet={t} hidden={false} />
            </ActionPanel.Section>
          )}
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
            {props.onToggleDetails && (
              <ToggleDetailsAction isShowingDetail={Boolean(withDetail)} onToggle={props.onToggleDetails} />
            )}
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
  pagination?: {
    pageSize: number;
    hasMore: boolean;
    onLoadMore: () => void;
  };
  searchText?: string;
  onSearchTextChange?: (text: string) => void;
  searchBarPlaceholder?: string;
  filtering?: boolean;
  emptyViewTitle?: string;
  emptyViewDescription?: string;
  emptyViewIcon?: Image.ImageLike;
  errorViewTitle?: string;
  error?: Error;
}) {
  const tweets = deduplicateById(props.tweets);
  const moderatableReplyIds = useModeratableReplyIds(tweets);
  const [isShowingDetail, setIsShowingDetail] = useState(shouldShowListWithDetails);
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
    <List
      isLoading={props.isLoading}
      searchText={props.searchText}
      onSearchTextChange={props.onSearchTextChange}
      searchBarPlaceholder={props.searchBarPlaceholder ?? "Filter posts by name..."}
      filtering={props.filtering}
      throttle={Boolean(props.onSearchTextChange)}
      isShowingDetail={isShowingDetail}
      pagination={
        props.pagination && props.pagination.pageSize < 1 ? { ...props.pagination, pageSize: 1 } : props.pagination
      }
    >
      {(props.emptyViewTitle || props.error) && (
        <List.EmptyView
          title={props.error ? (props.errorViewTitle ?? "Could Not Load Posts") : props.emptyViewTitle}
          description={props.error?.message ?? props.emptyViewDescription}
          icon={props.error ? Icon.ExclamationMark : props.emptyViewIcon}
          actions={
            props.fetcher || props.pagination?.hasMore ? (
              <ActionPanel>
                {!props.isLoading && props.pagination?.hasMore && (
                  <Action title="Load More Posts" icon={Icon.ArrowDown} onAction={props.pagination.onLoadMore} />
                )}
                <RefreshTweetsAction fetcher={props.fetcher} />
                <LogoutAction />
              </ActionPanel>
            ) : undefined
          }
        />
      )}
      {tweets?.map((tweet) => (
        <TweetListItem
          key={tweet.id}
          tweet={tweet}
          fetcher={props.fetcher}
          canModerateReply={moderatableReplyIds.has(tweet.id)}
          maxCommentDigits={maxCDigits}
          maxFavDigits={maxFavDigits}
          maxRTDigits={maxRTDigits}
          millifyState={millifyState}
          withDetail={isShowingDetail}
          onToggleDetails={setIsShowingDetail}
        />
      ))}
    </List>
  );
}
