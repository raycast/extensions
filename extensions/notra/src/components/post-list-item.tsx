import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { CONTENT_TYPE_ICONS, CONTENT_TYPE_LABELS } from "../schemas";
import { notraUrl } from "../utils";
import type { Post } from "../types";
import { PostDetail } from "./post-detail";

export function PostListItem({ post, onPostMutated }: { post: Post; onPostMutated?: () => Promise<void> | void }) {
  const contentTypeIcon = CONTENT_TYPE_ICONS[post.contentType] ?? Icon.Document;
  const contentTypeLabel = CONTENT_TYPE_LABELS[post.contentType] ?? post.contentType;

  return (
    <List.Item
      accessories={[
        { text: contentTypeLabel },
        {
          tag: {
            value: post.status === "published" ? "Published" : "Draft",
            color: post.status === "published" ? Color.Green : Color.Orange,
          },
        },
        {
          date: new Date(post.createdAt),
          tooltip: `Created: ${new Date(post.createdAt).toLocaleString()}`,
        },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Eye}
            target={<PostDetail onPostMutated={onPostMutated} postId={post.id} />}
            title="View Post"
          />
          <Action.OpenInBrowser icon={Icon.Globe} title="View on Notra" url={notraUrl(`/content/${post.id}`)} />
          <Action.CopyToClipboard
            content={notraUrl(`/content/${post.id}`)}
            shortcut={{ modifiers: ["cmd"], key: "." }}
            title="Copy Link"
          />
        </ActionPanel>
      }
      icon={contentTypeIcon}
      keywords={[post.title]}
      title={post.title.length > 60 ? `${post.title.slice(0, 60)}...` : post.title}
    />
  );
}
