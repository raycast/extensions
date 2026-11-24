import { Color, Icon, Image, List } from "@raycast/api";
import {
  commentMarkdown,
  FeedComment,
  FeedPost,
  postMarkdown,
  postTypeEmoji,
  postTypeLabel,
  reactionSummary,
} from "../lib/feed";

function avatar(url: string | undefined) {
  return url ? { source: url, mask: Image.Mask.Circle } : Icon.Person;
}

function authorText(name: string, username: string | undefined): string {
  return username ? `${name} · @${username}` : name;
}

function dateText(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return undefined;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function typeColor(type: string): Color {
  if (type === "ARTICLE") return Color.Blue;
  if (type === "MEMBER_JOINED") return Color.Green;
  if (type === "SHORT") return Color.Purple;
  return Color.SecondaryText;
}

export function PostItemDetail({ post }: { post: FeedPost }) {
  const reactions = reactionSummary(post.reactions, post.reactionCount);
  const published = dateText(post.publishedAt);
  return (
    <List.Item.Detail
      markdown={postMarkdown(post)}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Author"
            text={authorText(post.author.name, post.author.username)}
            icon={avatar(post.author.avatarUrl)}
          />
          {published ? (
            <List.Item.Detail.Metadata.Label title="Published" text={published} icon={Icon.Calendar} />
          ) : null}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Type">
            <List.Item.Detail.Metadata.TagList.Item
              text={`${postTypeEmoji(post.type)} ${postTypeLabel(post.type)}`}
              color={typeColor(post.type)}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label
            title="Conversation"
            text={`💬 ${post.commentCount} ${post.commentCount === 1 ? "comment" : "comments"}`}
          />
          <List.Item.Detail.Metadata.Label title="Reactions" text={reactions ?? "No reactions"} />
          {post.topics?.length ? (
            <List.Item.Detail.Metadata.TagList title="Topics">
              {post.topics.map((topic) => (
                <List.Item.Detail.Metadata.TagList.Item key={topic} text={topic} color={Color.Orange} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : null}
          {post.url ? <List.Item.Detail.Metadata.Link title="Link" text="Open original" target={post.url} /> : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export function CommentItemDetail({ comment }: { comment: FeedComment }) {
  const posted = dateText(comment.createdAt);
  return (
    <List.Item.Detail
      markdown={commentMarkdown(comment)}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Author"
            text={authorText(comment.author.name, comment.author.username)}
            icon={avatar(comment.author.avatarUrl)}
          />
          {posted ? <List.Item.Detail.Metadata.Label title="Posted" text={posted} icon={Icon.Calendar} /> : null}
          <List.Item.Detail.Metadata.Label
            title="Reactions"
            text={reactionSummary(comment.reactions, comment.reactionCount) ?? "No reactions"}
          />
          {comment.parentId ? (
            <List.Item.Detail.Metadata.TagList title="Kind">
              <List.Item.Detail.Metadata.TagList.Item text="↪ Reply" color={Color.Blue} />
            </List.Item.Detail.Metadata.TagList>
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
