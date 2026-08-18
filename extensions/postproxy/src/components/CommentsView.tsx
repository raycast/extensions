import { Action, ActionPanel, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { api, authHeaders, commentAction, deleteComment, normalizeList, replyComment } from "../lib/postproxy";
import { formatDate } from "../lib/format";
import type { Comment } from "../lib/types";
import { ReplyForm } from "./ReplyForm";

function commentMarkdown(comment: Comment): string {
  const lines = [`**@${comment.author_username ?? "unknown"}**`, "", comment.body || "_(no text)_"];
  if (comment.replies && comment.replies.length > 0) {
    lines.push("", "---", `**Replies (${comment.replies.length})**`);
    for (const reply of comment.replies) {
      lines.push("", `> **@${reply.author_username ?? "unknown"}**: ${reply.body}`);
    }
  }
  return lines.join("\n");
}

export function CommentsView({ postId, profileId }: { postId: string; profileId: string }) {
  const url = api(`/posts/${postId}/comments?profile_id=${profileId}&per_page=50`);
  const { data, isLoading, revalidate } = useFetch(url, {
    headers: authHeaders(),
    mapResult: (result: unknown) => ({ data: normalizeList<Comment>(result) }),
    initialData: [] as Comment[],
  });

  async function run(label: string, action: () => Promise<unknown>) {
    try {
      await action();
      await showToast({ style: Toast.Style.Success, title: label });
      revalidate();
    } catch (error) {
      await showFailureToast(error, { title: `${label} failed` });
    }
  }

  return (
    <List isLoading={isLoading} isShowingDetail navigationTitle="Comments" searchBarPlaceholder="Search comments…">
      {data.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Bubble} title="No comments" description="No comments on this post yet." />
      ) : (
        data.map((comment) => (
          <List.Item
            key={comment.id}
            icon={comment.author_avatar_url ? { source: comment.author_avatar_url } : Icon.Person}
            title={comment.author_username ?? "Unknown"}
            subtitle={comment.body}
            accessories={[
              ...(comment.is_hidden ? [{ icon: { source: Icon.EyeDisabled, tintColor: Color.SecondaryText } }] : []),
              { text: `♥ ${comment.like_count}` },
            ]}
            detail={
              <List.Item.Detail
                markdown={commentMarkdown(comment)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Likes" text={String(comment.like_count)} />
                    <List.Item.Detail.Metadata.Label title="Hidden" text={comment.is_hidden ? "Yes" : "No"} />
                    <List.Item.Detail.Metadata.Label
                      title="Posted"
                      text={formatDate(comment.posted_at ?? comment.created_at)}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title="Reply"
                  icon={Icon.Reply}
                  target={
                    <ReplyForm
                      title="Reply"
                      onSend={(text) => replyComment(postId, profileId, text, comment.id)}
                      onDone={revalidate}
                    />
                  }
                />
                <Action
                  title={comment.is_hidden ? "Unhide" : "Hide"}
                  icon={Icon.EyeDisabled}
                  onAction={() =>
                    run(comment.is_hidden ? "Unhidden" : "Hidden", () =>
                      commentAction(postId, comment.id, profileId, comment.is_hidden ? "unhide" : "hide"),
                    )
                  }
                />
                <Action
                  title="Like"
                  icon={Icon.Heart}
                  onAction={() => run("Liked", () => commentAction(postId, comment.id, profileId, "like"))}
                />
                <Action
                  title="Unlike"
                  icon={Icon.Heart}
                  onAction={() => run("Unliked", () => commentAction(postId, comment.id, profileId, "unlike"))}
                />
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    const ok = await confirmAlert({ title: "Delete comment?", message: "This cannot be undone." });
                    if (ok) run("Deleted", () => deleteComment(postId, comment.id, profileId));
                  }}
                />
                {comment.permalink ? (
                  <Action.OpenInBrowser title="Open Comment on Platform" url={comment.permalink} />
                ) : null}
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={() => revalidate()}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
