import { Action, ActionPanel, Color, Icon, Image, List, Toast, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { TinkererCommunity } from "./api/community";
import { getApiClient } from "./api/preferences";
import { CommentForm } from "./components/comment-form";
import { PostItemDetail } from "./components/feed-details";
import { PostThread } from "./components/post-thread";
import { PostReactionActions } from "./components/reaction-actions";
import { FeedPost, isCommentablePost, postTypeEmoji, postTypeLabel } from "./lib/feed";
import { errorMessage } from "./lib/json";

type FeedFilter = "all" | "articles" | "discussions" | "activity";

function excerpt(value: string, length = 110): string {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

function rowTitle(post: FeedPost): string {
  if (post.type === "MEMBER_JOINED") return `${post.author.name} joined Tinkerer Club`;
  return post.title ?? (excerpt(post.content) || `${postTypeLabel(post.type)} by ${post.author.name}`);
}

function rowSubtitle(post: FeedPost): string {
  const author = post.author.username ? `${post.author.name} · @${post.author.username}` : post.author.name;
  return post.title && post.content ? `${author} · ${excerpt(post.content, 80)}` : author;
}

function filterMatches(post: FeedPost, filter: FeedFilter): boolean {
  if (filter === "all") return true;
  if (filter === "articles") return post.type === "ARTICLE";
  if (filter === "discussions") return post.type === "SHORT";
  return post.type !== "SHORT" && post.type !== "ARTICLE";
}

function typeColor(type: string): Color {
  if (type === "ARTICLE") return Color.Blue;
  if (type === "MEMBER_JOINED") return Color.Green;
  if (type === "SHORT") return Color.Purple;
  return Color.SecondaryText;
}

function publishedDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

export default function BrowseFeedCommand() {
  const client = useMemo(() => getApiClient(), []);
  const community = useMemo(() => new TinkererCommunity(client), [client]);
  const [failure, setFailure] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [revision, setRevision] = useState(0);
  const reload = () => setRevision((value) => value + 1);
  const visiblePosts = useMemo(() => posts.filter((post) => filterMatches(post, filter)), [filter, posts]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setIsLoading(true);
      setFailure(undefined);
      try {
        const page = await community.feed(40, controller.signal);
        setPosts(page.posts);
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = errorMessage(error);
        setFailure(message);
        setPosts([]);
        await showToast({ style: Toast.Style.Failure, title: "Could Not Load Feed", message });
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [community, revision]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search posts, people, and topics"
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Feed" value={filter} onChange={(value) => setFilter(value as FeedFilter)}>
          <List.Dropdown.Item title="Everything" value="all" icon={Icon.Globe} />
          <List.Dropdown.Item title="Discussions" value="discussions" icon={Icon.SpeechBubble} />
          <List.Dropdown.Item title="Articles" value="articles" icon={Icon.Book} />
          <List.Dropdown.Item title="Club Activity" value="activity" icon={Icon.TwoPeople} />
        </List.Dropdown>
      }
    >
      <List.Section title="Latest feed" subtitle={`${visiblePosts.length} items`}>
        {visiblePosts.map((post) => (
          <List.Item
            key={post.id}
            icon={
              post.author.avatarUrl
                ? { source: post.author.avatarUrl, mask: Image.Mask.Circle }
                : { source: Icon.Person, tintColor: typeColor(post.type) }
            }
            title={rowTitle(post)}
            subtitle={rowSubtitle(post)}
            keywords={[post.author.name, post.author.username ?? "", post.type, ...(post.topics ?? [])]}
            accessories={[
              {
                tag: { value: `${postTypeEmoji(post.type)} ${postTypeLabel(post.type)}`, color: typeColor(post.type) },
              },
              ...(post.commentCount ? [{ text: `💬 ${post.commentCount}`, tooltip: "Comments" }] : []),
              ...(post.reactionCount ? [{ text: `✨ ${post.reactionCount}`, tooltip: "Reactions" }] : []),
              ...(publishedDate(post.publishedAt) ? [{ date: publishedDate(post.publishedAt) }] : []),
            ]}
            detail={<PostItemDetail post={post} />}
            actions={
              <ActionPanel>
                {post.commentCount > 0 ? (
                  <Action.Push
                    title={`View ${post.commentCount} ${post.commentCount === 1 ? "Comment" : "Comments"}`}
                    icon={Icon.Sidebar}
                    target={<PostThread community={community} post={post} />}
                  />
                ) : isCommentablePost(post) ? (
                  <Action.Push
                    title="Add First Comment"
                    icon={Icon.Message}
                    target={<CommentForm community={community} postId={post.id} onCreated={reload} />}
                  />
                ) : null}
                <PostReactionActions
                  community={community}
                  id={post.id}
                  viewerReaction={post.viewerReaction}
                  onChanged={reload}
                />
                {post.content ? <Action.CopyToClipboard title="Copy Post Text" content={post.content} /> : null}
                {post.url ? <Action.OpenInBrowser title="Open Post in Browser" url={post.url} /> : null}
                <Action title="Reload Feed" icon={Icon.ArrowClockwise} onAction={reload} />
                <Action.OpenInBrowser title="Open Tinkerer Club" url={client.baseUrl} icon={Icon.Globe} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {!isLoading && visiblePosts.length === 0 ? (
        <List.EmptyView
          title={failure ? "Could Not Load Feed" : "Nothing Here"}
          description={failure ?? "Try another feed filter or search."}
          icon={failure ? Icon.Warning : Icon.SpeechBubble}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={reload} />
              <Action.OpenInBrowser title="Open Tinkerer Club" url={client.baseUrl} />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
