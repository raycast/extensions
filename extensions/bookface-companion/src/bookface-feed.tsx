import {
  ActionPanel,
  Action,
  List,
  Icon,
  showToast,
  Toast,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import type { FeedPost } from "./types";
import {
  getFeed,
  getPostComments,
  upvotePost,
  removeVote,
  type Comment,
} from "./lib/bookface";
import { hasCredentials } from "./lib/auth";

export default function Command() {
  if (!hasCredentials()) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Lock}
          title="Bookface Login Required"
          description="Set your YC username and password in extension preferences to view the feed."
          actions={
            <ActionPanel>
              <Action
                title="Open Preferences"
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return <Feed />;
}

function Feed() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useCachedPromise(
    async () => {
      try {
        const allPosts: FeedPost[] = [];
        let cursor: string | undefined;
        for (let i = 0; i < 4; i++) {
          const feed = await getFeed(cursor);
          allPosts.push(...feed.posts);
          cursor = (feed.meta as { next_cursor?: string }).next_cursor;
          if (!cursor) break;
        }
        return allPosts;
      } catch (e) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load feed",
          message: String(e),
        });
        return [];
      }
    },
    [],
    { keepPreviousData: true },
  );

  const selectedPostId = selectedId ? Number(selectedId) : null;

  const { data: comments } = useCachedPromise(
    async (postId: number | null) => {
      if (!postId) return [];
      try {
        return await getPostComments(postId);
      } catch {
        return [];
      }
    },
    [selectedPostId],
    { keepPreviousData: true },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter posts..."
      isShowingDetail
      onSelectionChange={setSelectedId}
    >
      {data?.map((post) => (
        <PostListItem
          key={post.id}
          post={post}
          comments={selectedPostId === post.id ? (comments ?? []) : []}
        />
      ))}
    </List>
  );
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function renderComment(comment: Comment, depth = 0): string {
  const indent = ">".repeat(depth);
  const prefix = indent ? indent + " " : "";
  const company = comment.user.companies?.[0];
  const author = [comment.user.full_name, company?.name, company?.batch]
    .filter(Boolean)
    .join(" · ");
  const votes = comment.vote_info?.count
    ? ` · ${comment.vote_info.count} upvotes`
    : "";
  let md = `${prefix}**${author}** · *${timeAgo(comment.created_at)}${votes}*\n${prefix}\n`;
  const cleanBody = comment.body
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "`[IMAGE]`") // strip markdown images
    .replace(/<img[^>]*>/g, "`[IMAGE]`"); // strip HTML img tags
  for (const line of cleanBody.split("\n")) {
    md += `${prefix}${line}\n`;
  }
  md += "\n";
  for (const reply of comment.replies ?? []) {
    md += renderComment(reply, depth + 1);
  }
  return md;
}

function PostListItem({
  post,
  comments,
}: {
  post: FeedPost;
  comments: Comment[];
}) {
  const author = post.user;
  const votes = post.vote_info?.count;
  const authorLine = [
    author.full_name,
    author.company_name,
    author.batch_name,
    votes ? `${votes} upvotes` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  const postBody = (post.body_v2 || post.body || post.feed_preview || "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "`[IMAGE]`")
    .replace(/<img[^>]*>/g, "`[IMAGE]`");
  const commentsMd =
    comments.length > 0
      ? `\n\n---\n\n### Comments (${comments.length})\n\n` +
        comments.map((c) => renderComment(c)).join("\n")
      : "";
  // body_v2 typically starts with the title, then \n\n, then content
  // Insert author line after the first paragraph break
  const firstBreak = postBody.indexOf("\n\n");
  const bodyWithAuthor =
    firstBreak >= 0
      ? `${postBody.slice(0, firstBreak)}\n\n*${authorLine} · ${timeAgo(post.created_at)}*\n\n${postBody.slice(firstBreak + 2)}`
      : `${postBody}\n\n*${authorLine} · ${timeAgo(post.created_at)}*`;
  const bodyMarkdown = `${bodyWithAuthor}${commentsMd}`;

  return (
    <List.Item
      id={String(post.id)}
      icon={
        author.avatar_thumb
          ? { source: author.avatar_thumb, mask: "circle" as const }
          : Icon.Person
      }
      title={post.title || "(untitled)"}
      keywords={[
        author.full_name,
        author.company_name ?? "",
        author.batch_name ?? "",
        post.channel,
        ...(post.all_tags ?? []),
      ].filter(Boolean)}
      accessories={[{ text: timeAgo(post.created_at) }]}
      detail={<List.Item.Detail markdown={bodyMarkdown} />}
      actions={
        <ActionPanel title={post.title}>
          <Action.OpenInBrowser title="Open on Bookface" url={post.url} />
          {post.vote_info?.current_user_vote ? (
            <Action
              title="Remove Upvote"
              icon={Icon.ArrowDown}
              shortcut={{ modifiers: ["cmd"], key: "u" }}
              onAction={async () => {
                try {
                  await removeVote(
                    post.id,
                    post.vote_info!.current_user_vote!.id,
                  );
                  post.vote_info!.current_user_vote = null;
                  showToast({
                    style: Toast.Style.Success,
                    title: "Upvote removed",
                  });
                } catch (e) {
                  showToast({
                    style: Toast.Style.Failure,
                    title: "Failed",
                    message: String(e),
                  });
                }
              }}
            />
          ) : (
            <Action
              title="Upvote"
              icon={Icon.ArrowUp}
              shortcut={{ modifiers: ["cmd"], key: "u" }}
              onAction={async () => {
                try {
                  const vote = await upvotePost(post.id);
                  post.vote_info.current_user_vote = vote;
                  showToast({ style: Toast.Style.Success, title: "Upvoted" });
                } catch (e) {
                  showToast({
                    style: Toast.Style.Failure,
                    title: "Failed",
                    message: String(e),
                  });
                }
              }}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Link"
            content={post.url}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
