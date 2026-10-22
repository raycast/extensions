import { Action, ActionPanel, Color, Icon, List, Keyboard } from "@raycast/api";
import { CONTENT_TYPE_ICONS, CONTENT_TYPE_LABELS } from "../schemas";
import type { ReactNode } from "react";
import { notraOrganizationUrl } from "../utils";
import type { Post } from "../types";
import { PostDetail } from "./post-detail";

interface PostListItemProps {
  extraActions?: ReactNode;
  onPostMutated?: () => Promise<void> | void;
  organizationSlug?: string;
  post: Post;
}

export function PostListItem({ extraActions, onPostMutated, organizationSlug, post }: PostListItemProps) {
  const postUrl = notraOrganizationUrl(`/content/${post.id}`, organizationSlug);
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
          <Action.OpenInBrowser icon={Icon.Globe} title="View on Notra" url={postUrl} />
          <Action.CopyToClipboard
            content={postUrl}
            shortcut={Keyboard.Shortcut.Common.CopyDeeplink}
            title="Copy Link"
          />
          {extraActions}
        </ActionPanel>
      }
      icon={contentTypeIcon}
      keywords={[post.title]}
      title={post.title.length > 60 ? `${post.title.slice(0, 60)}...` : post.title}
    />
  );
}
