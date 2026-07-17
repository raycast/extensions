import { Action, Icon } from "@raycast/api";
import { Post } from "../lib/types";
import { EditPostForm } from "./edit-post-form";

/**
 * Deep-links straight to a specific post in the Buffer publishing app. The path
 * form `/channels/{channelId}/schedule/{postId}` opens that post's focused
 * popover for any status (draft → edit pencil, sent → metrics + View Post),
 * verified against the live app. The full edit modal itself has no URL, so this
 * popover (one click from editing) is the closest per-post entry point.
 */
function bufferUrl(post: Post): string {
  const base = "https://publish.buffer.com";
  if (!post.channelId || !post.id) return base;
  return `${base}/channels/${post.channelId}/schedule/${post.id}`;
}

/** Opens the post straight in Buffer's full edit modal (drafts/scheduled). */
function bufferEditUrl(post: Post): string | null {
  if (!post.channelId || !post.id) return null;
  return `https://publish.buffer.com/channels/${post.channelId}/schedule/${post.id}/edit`;
}

/**
 * Shared action set for a post. Rendered inside an <ActionPanel> by the caller.
 * `detailComponent` lets the list pass its "Show Details" push target without a
 * circular import between list and detail.
 */
export function PostActions({
  post,
  onMutate,
  detailAction,
}: {
  post: Post;
  onMutate?: () => void;
  detailAction?: React.ReactNode;
}) {
  const canEdit = post.status !== "sent";

  return (
    <>
      {detailAction}
      {post.externalLink && (
        <Action.OpenInBrowser
          title="Open on Network"
          icon={Icon.Globe}
          url={post.externalLink}
        />
      )}
      <Action.OpenInBrowser
        title="Open in Buffer"
        icon={Icon.AppWindow}
        url={bufferUrl(post)}
        shortcut={{ modifiers: ["cmd"], key: "o" }}
      />
      {canEdit && bufferEditUrl(post) && (
        <Action.OpenInBrowser
          title="Edit in Buffer"
          icon={Icon.Pencil}
          url={bufferEditUrl(post)!}
          shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
        />
      )}
      {canEdit && (
        <Action.Push
          title="Quick Edit in Raycast"
          icon={Icon.TextInput}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          target={<EditPostForm post={post} onSaved={onMutate} />}
        />
      )}
      <Action.CopyToClipboard
        title="Copy Post Text"
        content={post.text ?? ""}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
    </>
  );
}
