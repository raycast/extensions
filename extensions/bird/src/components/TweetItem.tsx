import { List, ActionPanel, Action, Icon, Image } from "@raycast/api"
import tinyRelativeDate from "tiny-relative-date"
import { Tweet } from "../types"

interface TweetItemProps {
  tweet: Tweet
  loadMore?: () => void
  canLoadMore?: boolean
}

export function TweetItem({ tweet, loadMore, canLoadMore }: TweetItemProps) {
  const tweetUrl = `https://x.com/${tweet.author.username}/status/${tweet.id}`
  const authorUrl = `https://x.com/${tweet.author.username}`
  // Replace newlines with spaces for subtitle display
  const textForSubtitle = tweet.text.replace(/\n+/g, " ").trim()
  const truncatedText =
    textForSubtitle.length > 100
      ? textForSubtitle.slice(0, 100) + "…"
      : textForSubtitle

  // Remove newlines from keywords
  const keywords = [
    tweet.author.username,
    ...tweet.author.name.split(" "),
    ...tweet.text.replace(/\n+/g, " ").split(" "),
  ].filter(Boolean)

  return (
    <List.Item
      title={tweet.author.name}
      subtitle={truncatedText}
      icon={{
        source: `https://unavatar.io/twitter/${tweet.author.username}`,
        mask: Image.Mask.Circle,
      }}
      keywords={keywords}
      detail={
        <List.Item.Detail
          markdown={`${tweet.text}${tweet.media?.length ? `\n\n![](${tweet.media[0].previewUrl || tweet.media[0].url})` : ""}`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Link
                title="Tweet"
                target={tweetUrl}
                text={tweet.id}
              />
              <List.Item.Detail.Metadata.Link
                title="Author"
                target={authorUrl}
                text={`@${tweet.author.username}`}
              />
              <List.Item.Detail.Metadata.Label
                title="Posted"
                text={tinyRelativeDate(new Date(tweet.createdAt))}
                icon={Icon.Calendar}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Likes"
                text={String(tweet.likeCount)}
                icon={Icon.Heart}
              />
              <List.Item.Detail.Metadata.Label
                title="Retweets"
                text={String(tweet.retweetCount)}
                icon={Icon.Repeat}
              />
              <List.Item.Detail.Metadata.Label
                title="Replies"
                text={String(tweet.replyCount)}
                icon={Icon.Bubble}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={tweetUrl} title="Open Tweet" />
          <Action.OpenInBrowser
            url={authorUrl}
            title="Open Author Profile"
            icon={Icon.Person}
          />
          <Action.CopyToClipboard
            title="Copy Tweet Text"
            content={tweet.text}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Tweet URL"
            content={tweetUrl}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          {canLoadMore && loadMore && (
            <Action
              title="Load More"
              icon={Icon.Download}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              onAction={loadMore}
            />
          )}
        </ActionPanel>
      }
    />
  )
}
