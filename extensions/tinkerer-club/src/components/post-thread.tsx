import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { TinkererCommunity } from "../api/community";
import { loadConversation } from "../lib/conversation";
import { FeedComment, FeedPost, isCommentablePost, postTypeEmoji, postTypeLabel, reactionSummary } from "../lib/feed";
import { errorMessage } from "../lib/json";
import { CommentForm } from "./comment-form";
import { CommentItemDetail, PostItemDetail } from "./feed-details";
import { CommentReactionActions, PostReactionActions } from "./reaction-actions";

interface PostThreadProps {
  community: TinkererCommunity;
  post: FeedPost;
}

function commentTitle(comment: FeedComment): string {
  const content = comment.content.replace(/\s+/g, " ").trim() || "No text content";
  return content.length > 90 ? `${content.slice(0, 89)}…` : content;
}

function commentSubtitle(comment: FeedComment): string {
  return comment.author.username ? `${comment.author.name} · @${comment.author.username}` : comment.author.name;
}

function validDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

export function PostThread({ community, post }: PostThreadProps) {
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [currentPost, setCurrentPost] = useState(post);
  const [failure, setFailure] = useState<string>();
  const [isLoading, setIsLoading] = useState(post.commentCount > 0);
  const [revision, setRevision] = useState(0);
  const reload = () => setRevision((value) => value + 1);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setIsLoading(post.commentCount > 0);
      setFailure(undefined);
      try {
        const conversation = await loadConversation(post, community, controller.signal);
        setCurrentPost(conversation.post);
        setComments(conversation.comments);
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = errorMessage(error);
        setFailure(message);
        setComments([]);
        await showToast({ style: Toast.Style.Failure, title: "Could Not Load Comments", message });
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [community, post, revision]);

  function updatePostReaction(nextReaction: string | null) {
    setCurrentPost((current) => {
      const hadReaction = Boolean(current.viewerReaction);
      const reactionCount = Math.max(
        0,
        current.reactionCount + (nextReaction && !hadReaction ? 1 : 0) - (!nextReaction && hadReaction ? 1 : 0),
      );
      if (nextReaction) return { ...current, reactionCount, viewerReaction: nextReaction };
      const withoutViewerReaction = { ...current, reactionCount };
      delete withoutViewerReaction.viewerReaction;
      return withoutViewerReaction;
    });
  }

  const canComment = isCommentablePost(currentPost);
  const postReactions = reactionSummary(currentPost.reactions, currentPost.reactionCount);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="Conversation"
      searchBarPlaceholder={comments.length ? "Search comments" : "No comments to search"}
    >
      <List.Section title="📝 Post" subtitle={postTypeLabel(currentPost.type)}>
        <List.Item
          icon={currentPost.author.avatarUrl ?? Icon.SpeechBubble}
          title={currentPost.title ?? `${postTypeEmoji(currentPost.type)} ${postTypeLabel(currentPost.type)}`}
          subtitle={currentPost.author.username ? `@${currentPost.author.username}` : currentPost.author.name}
          accessories={[
            ...(currentPost.commentCount ? [{ text: `💬 ${currentPost.commentCount}` }] : []),
            ...(postReactions ? [{ text: postReactions }] : []),
          ]}
          detail={<PostItemDetail post={currentPost} />}
          actions={
            <ActionPanel>
              {canComment ? (
                <Action.Push
                  title="Add Comment"
                  icon={Icon.Message}
                  target={<CommentForm community={community} postId={post.id} onCreated={reload} />}
                />
              ) : null}
              <PostReactionActions
                community={community}
                id={currentPost.id}
                viewerReaction={currentPost.viewerReaction}
                onChanged={updatePostReaction}
              />
              {currentPost.content ? (
                <Action.CopyToClipboard title="Copy Post Text" content={currentPost.content} />
              ) : null}
              {currentPost.url ? <Action.OpenInBrowser title="Open Post in Browser" url={currentPost.url} /> : null}
              <Action title="Reload Conversation" icon={Icon.ArrowClockwise} onAction={reload} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="💬 Comments" subtitle={comments.length ? `${comments.length}` : "None"}>
        {comments.map((comment) => {
          const reactions = reactionSummary(comment.reactions, comment.reactionCount);
          return (
            <List.Item
              key={comment.id}
              icon={comment.author.avatarUrl ?? Icon.Person}
              title={commentTitle(comment)}
              subtitle={commentSubtitle(comment)}
              accessories={[
                ...(reactions ? [{ text: reactions }] : []),
                ...(validDate(comment.createdAt) ? [{ date: validDate(comment.createdAt) }] : []),
              ]}
              detail={<CommentItemDetail comment={comment} />}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Reply"
                    icon={Icon.Reply}
                    target={
                      <CommentForm community={community} postId={post.id} parentId={comment.id} onCreated={reload} />
                    }
                  />
                  <CommentReactionActions
                    community={community}
                    id={comment.id}
                    viewerReaction={comment.viewerReaction}
                    onChanged={reload}
                  />
                  <Action.CopyToClipboard title="Copy Comment" content={comment.content} />
                  <Action title="Reload Conversation" icon={Icon.ArrowClockwise} onAction={reload} />
                </ActionPanel>
              }
            />
          );
        })}

        {!isLoading && comments.length === 0 ? (
          <List.Item
            icon={failure ? Icon.Warning : Icon.SpeechBubble}
            title={failure ? "Comments Unavailable" : "No Comments Yet"}
            subtitle={failure ?? "This feed item has no comments."}
            detail={
              <List.Item.Detail
                markdown={
                  failure ? `# Comments unavailable\n\n${failure}` : "# No comments yet\n\nThere is nothing to load."
                }
              />
            }
            {...(canComment || failure
              ? {
                  actions: (
                    <ActionPanel>
                      {canComment ? (
                        <Action.Push
                          title="Add First Comment"
                          icon={Icon.Message}
                          target={<CommentForm community={community} postId={post.id} onCreated={reload} />}
                        />
                      ) : null}
                      {failure ? <Action title="Retry" icon={Icon.ArrowClockwise} onAction={reload} /> : null}
                    </ActionPanel>
                  ),
                }
              : {})}
          />
        ) : null}
      </List.Section>
    </List>
  );
}
