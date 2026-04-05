import {
  List,
  ActionPanel,
  Action,
  Icon,
  confirmAlert,
  Alert,
  showToast,
  Toast,
} from "@raycast/api";
import type { Post } from "../lib/types";
import {
  getPostTitle,
  getPostSubtitle,
  getPostText,
  getStatusIcon,
  formatDate,
  getTypeTag,
} from "../lib/utils";
import { deletePost, publishPost } from "../lib/api";
import { getBaseUrl } from "../lib/preferences";

interface PostItemProps {
  post: Post;
  onRefresh: () => void;
  showDetail: boolean;
}

export function PostItem({ post, onRefresh, showDetail }: PostItemProps) {
  const statusIcon = getStatusIcon(post.status);
  const typeTag = getTypeTag(post.type);
  const baseUrl = getBaseUrl();

  return (
    <List.Item
      title={getPostTitle(post)}
      subtitle={showDetail ? undefined : getPostSubtitle(post)}
      icon={statusIcon}
      accessories={
        showDetail
          ? undefined
          : [
              { tag: { value: typeTag.label, color: typeTag.color } },
              ...(post.schedule_at
                ? [{ text: formatDate(post.schedule_at), icon: Icon.Clock }]
                : []),
              { text: post.status, icon: statusIcon },
            ]
      }
      detail={
        showDetail ? (
          <List.Item.Detail
            markdown={getPostText(post)}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label
                  title="Status"
                  text={post.status}
                  icon={statusIcon}
                />
                <List.Item.Detail.Metadata.Label
                  title="Type"
                  text={post.type}
                />
                <List.Item.Detail.Metadata.Label
                  title="Created"
                  text={formatDate(post.created_at)}
                />
                {post.schedule_at && (
                  <List.Item.Detail.Metadata.Label
                    title="Scheduled"
                    text={formatDate(post.schedule_at)}
                  />
                )}
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="Platforms"
                  text={getPostSubtitle(post)}
                />
                {post.published_urls &&
                  Object.entries(post.published_urls).map(([platform, url]) => (
                    <List.Item.Detail.Metadata.Link
                      key={platform}
                      title={platform}
                      text="View"
                      target={url}
                    />
                  ))}
              </List.Item.Detail.Metadata>
            }
          />
        ) : undefined
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open in OmniSocials"
              url={`${baseUrl}/posts`}
            />
            <Action.CopyToClipboard
              title="Copy Content"
              content={getPostText(post)}
            />
          </ActionPanel.Section>

          {(post.status === "draft" || post.status === "scheduled") && (
            <ActionPanel.Section>
              <Action
                title="Publish Now"
                icon={Icon.Upload}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                onAction={async () => {
                  if (
                    await confirmAlert({
                      title: "Publish Post",
                      message:
                        "Are you sure you want to publish this post now?",
                      primaryAction: {
                        title: "Publish",
                        style: Alert.ActionStyle.Default,
                      },
                    })
                  ) {
                    await showToast({
                      style: Toast.Style.Animated,
                      title: "Publishing...",
                    });
                    try {
                      await publishPost(post.id);
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Post published!",
                      });
                      onRefresh();
                    } catch (error) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Failed to publish",
                        message:
                          error instanceof Error
                            ? error.message
                            : "Unknown error",
                      });
                    }
                  }
                }}
              />
            </ActionPanel.Section>
          )}

          {post.published_urls &&
            Object.entries(post.published_urls).map(([platform, url]) => (
              <Action.OpenInBrowser
                key={platform}
                title={`Open on ${platform}`}
                url={url}
              />
            ))}

          <ActionPanel.Section>
            <Action
              title="Delete Post"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={async () => {
                if (
                  await confirmAlert({
                    title: "Delete Post",
                    message: "Are you sure you want to delete this post?",
                    primaryAction: {
                      title: "Delete",
                      style: Alert.ActionStyle.Destructive,
                    },
                  })
                ) {
                  await showToast({
                    style: Toast.Style.Animated,
                    title: "Deleting...",
                  });
                  try {
                    await deletePost(post.id);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Post deleted",
                    });
                    onRefresh();
                  } catch (error) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to delete",
                      message:
                        error instanceof Error
                          ? error.message
                          : "Unknown error",
                    });
                  }
                }
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
