import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { usePost } from "../hooks/use-post";
import { deletePost, updatePost } from "../lib/notra";
import { CONTENT_TYPE_LABELS } from "../schemas";
import { getErrorMessage, notraUrl } from "../utils";
import { EditPostForm } from "./edit-post-form";

export function PostDetail({ postId, onPostMutated }: { postId: string; onPostMutated?: () => Promise<void> | void }) {
  const { pop } = useNavigation();
  const { data, isLoading, revalidate } = usePost(postId);
  const post = data?.post;
  const organization = data?.organization;

  const markdown = post ? `# ${post.title}\n\n${post.markdown}` : "";

  async function refreshPostState() {
    await revalidate();
    await onPostMutated?.();
  }

  async function handleStatusChange() {
    if (!post) {
      return;
    }

    const nextStatus = post.status === "published" ? "draft" : "published";
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: nextStatus === "published" ? "Publishing post" : "Moving post to draft",
    });

    try {
      await updatePost(post.id, {
        title: post.title,
        markdown: post.markdown,
        status: nextStatus,
      });
      await refreshPostState();
      toast.style = Toast.Style.Success;
      toast.title = nextStatus === "published" ? "Post published" : "Post moved to draft";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not update post";
      toast.message = getErrorMessage(error);
    }
  }

  async function handleDelete() {
    if (!post) {
      return;
    }

    const confirmed = await confirmAlert({
      title: "Delete post?",
      message: `This will permanently delete "${post.title}".`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting post",
    });

    try {
      await deletePost(post.id);
      await onPostMutated?.();
      toast.style = Toast.Style.Success;
      toast.title = "Post deleted";
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not delete post";
      toast.message = getErrorMessage(error);
    }
  }

  return (
    <Detail
      actions={
        post ? (
          <ActionPanel>
            <ActionPanel.Section>
              <Action.Push
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                target={<EditPostForm onPostUpdated={refreshPostState} post={post} />}
                title="Edit Post"
              />
              <Action
                icon={post.status === "published" ? Icon.Pencil : Icon.Upload}
                onAction={handleStatusChange}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                title={post.status === "published" ? "Move to Draft" : "Publish Post"}
              />
              <Action
                icon={Icon.Trash}
                onAction={handleDelete}
                shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                style={Action.Style.Destructive}
                title="Delete Post"
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action.OpenInBrowser
                icon={Icon.Globe}
                title="View on Notra"
                url={
                  organization ? notraUrl(`/${organization.slug}/content/${post.id}`) : notraUrl(`/content/${post.id}`)
                }
              />
              <Action
                icon={Icon.ArrowClockwise}
                onAction={() => revalidate()}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                title="Refresh"
              />
              <Action.CopyToClipboard
                content={post.markdown}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                title="Copy Markdown"
              />
              <Action.CopyToClipboard
                content={notraUrl(`/content/${post.id}`)}
                shortcut={{ modifiers: ["cmd"], key: "." }}
                title="Copy Link"
              />
            </ActionPanel.Section>
          </ActionPanel>
        ) : null
      }
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        post ? (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item
                color={post.status === "published" ? Color.Green : Color.Orange}
                text={post.status === "published" ? "Published" : "Draft"}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label text={organization?.name ?? "-"} title="Organization" />
            <Detail.Metadata.Label text={CONTENT_TYPE_LABELS[post.contentType] ?? post.contentType} title="Type" />
            {(post.contentType === "blog_post" || post.contentType === "changelog") && (
              <Detail.Metadata.Label text={post.slug ?? "—"} title="Slug" />
            )}
            <Detail.Metadata.Label text={new Date(post.createdAt).toLocaleDateString()} title="Created" />
            <Detail.Metadata.Label text={new Date(post.updatedAt).toLocaleDateString()} title="Updated" />
          </Detail.Metadata>
        ) : null
      }
    />
  );
}
