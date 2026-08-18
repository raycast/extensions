import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { usePromise } from "@raycast/utils";
import { CommentsView } from "./components/CommentsView";
import { PostDetail } from "./components/PostDetail";
import { ReplyForm } from "./components/ReplyForm";
import { supportsComments } from "./lib/comments";
import { groupNameFor, groupProfiles, profileOptionTitle } from "./lib/grouping";
import { useProfileGroups, useProfiles } from "./lib/hooks";
import { formatDate } from "./lib/format";
import { api, authHeaders, normalizeList, replyComment } from "./lib/postproxy";
import { platformIcon, platformLabel } from "./lib/platforms";
import type { Comment, Post, Profile } from "./lib/types";

interface CommentEntry {
  comment: Comment;
  post: Post;
  profile: Profile;
}

function commentTime(entry: CommentEntry): number {
  return new Date(entry.comment.posted_at ?? entry.comment.created_at).getTime();
}

/**
 * Aggregate comments across the given profiles' recent posts. The API has no
 * global comments feed, so we fetch recent posts per profile and their comments,
 * tag each with its profile, then flatten and sort newest-first.
 */
async function loadRecentComments(targets: Profile[]): Promise<CommentEntry[]> {
  if (targets.length === 0) return [];
  const postsPerProfile = targets.length > 1 ? 10 : 15;
  const perProfile = await Promise.all(
    targets.map(async (profile) => {
      const postsResponse = await fetch(api(`/posts?profile_id=${profile.id}&per_page=${postsPerProfile}`), {
        headers: authHeaders(),
      });
      if (!postsResponse.ok) return [] as CommentEntry[];
      const posts = normalizeList<Post>(await postsResponse.json());
      const chunks = await Promise.all(
        posts.map(async (post) => {
          try {
            const response = await fetch(api(`/posts/${post.id}/comments?profile_id=${profile.id}&per_page=20`), {
              headers: authHeaders(),
            });
            if (!response.ok) return [] as CommentEntry[];
            return normalizeList<Comment>(await response.json()).map((comment) => ({ comment, post, profile }));
          } catch {
            return [] as CommentEntry[];
          }
        }),
      );
      return chunks.flat();
    }),
  );
  return perProfile.flat().sort((a, b) => commentTime(b) - commentTime(a));
}

function commentMarkdown(entry: CommentEntry): string {
  return [`**@${entry.comment.author_username ?? "unknown"}**`, "", entry.comment.body || "_(no text)_"].join("\n");
}

export default function RecentComments() {
  const { data: profiles, isLoading: loadingProfiles } = useProfiles();
  const { data: groups } = useProfileGroups();
  const commentable = profiles.filter((profile) => supportsComments(profile.platform));
  const [selected, setSelected] = useState(""); // "" = All profiles

  const commentableKey = commentable.map((profile) => profile.id).join(",");
  const targets = useMemo(
    () => (selected ? commentable.filter((profile) => profile.id === selected) : commentable),
    [selected, commentableKey],
  );

  const { data, isLoading, revalidate } = usePromise(loadRecentComments, [targets]);
  const entries = data ?? [];

  return (
    <List
      isLoading={loadingProfiles || isLoading}
      isShowingDetail
      searchBarPlaceholder="Search comments…"
      searchBarAccessory={
        <List.Dropdown tooltip="Profile" value={selected} onChange={setSelected}>
          <List.Dropdown.Item icon={Icon.Globe} title="All Profiles" value="" />
          {groupProfiles(commentable, groups).map((group) => (
            <List.Dropdown.Section key={group.id} title={group.name}>
              {group.profiles.map((profile) => (
                <List.Dropdown.Item
                  key={profile.id}
                  icon={platformIcon(profile.platform)}
                  title={profileOptionTitle(profile)}
                  value={profile.id}
                />
              ))}
            </List.Dropdown.Section>
          ))}
        </List.Dropdown>
      }
    >
      {commentable.length === 0 && !loadingProfiles ? (
        <List.EmptyView
          icon={Icon.Bubble}
          title="No commentable profiles"
          description="Connect Instagram, Facebook, Threads, YouTube, or LinkedIn."
        />
      ) : entries.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Bubble}
          title="No recent comments"
          description="No comments found on recent posts."
        />
      ) : (
        entries.map((entry) => {
          const { comment, post, profile } = entry;
          const groupName = groupNameFor(groups, profile.profile_group_id);
          const postText = (post.body ?? post.content ?? "").replace(/\s+/g, " ").trim();
          const postPermalink =
            post.platforms.find((o) => o.platform.toLowerCase() === profile.platform.toLowerCase())?.permalink ??
            undefined;
          return (
            <List.Item
              key={`${profile.id}-${post.id}-${comment.id}`}
              icon={comment.author_avatar_url ? { source: comment.author_avatar_url } : Icon.Bubble}
              title={comment.author_username ?? "Unknown"}
              subtitle={comment.body}
              accessories={[
                {
                  icon: platformIcon(profile.platform),
                  text: profile.name,
                  tooltip: `${platformLabel(profile.platform)} · ${groupName}`,
                },
                ...(comment.like_count > 0 ? [{ text: `♥ ${comment.like_count}` }] : []),
                { date: new Date(comment.posted_at ?? comment.created_at) },
              ]}
              detail={
                <List.Item.Detail
                  markdown={commentMarkdown(entry)}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Commented"
                        icon={Icon.Clock}
                        text={formatDate(comment.posted_at ?? comment.created_at)}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Profile"
                        icon={platformIcon(profile.platform)}
                        text={`${profile.name} · ${platformLabel(profile.platform)}`}
                      />
                      <List.Item.Detail.Metadata.Label title="Group" icon={Icon.Folder} text={groupName} />
                      {comment.like_count > 0 ? (
                        <List.Item.Detail.Metadata.Label
                          title="Likes"
                          icon={Icon.Heart}
                          text={String(comment.like_count)}
                        />
                      ) : null}
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="On Post"
                        text={postText ? postText.slice(0, 100) : "(no text)"}
                      />
                      {postPermalink ? (
                        <List.Item.Detail.Metadata.Link title="Post" target={postPermalink} text="Open on Platform" />
                      ) : null}
                      {comment.permalink ? (
                        <List.Item.Detail.Metadata.Link
                          title="Comment"
                          target={comment.permalink}
                          text="Open on Platform"
                        />
                      ) : null}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Comments"
                    icon={Icon.Bubble}
                    target={<CommentsView postId={post.id} profileId={profile.id} />}
                  />
                  <Action.Push
                    title="Reply"
                    icon={Icon.Reply}
                    target={
                      <ReplyForm
                        title="Reply"
                        onSend={(text) => replyComment(post.id, profile.id, text, comment.id)}
                        onDone={revalidate}
                      />
                    }
                  />
                  {comment.permalink ? (
                    <Action.OpenInBrowser
                      title="Open Comment on Platform"
                      icon={Icon.Bubble}
                      url={comment.permalink}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                    />
                  ) : null}
                  {postPermalink ? (
                    <Action.OpenInBrowser
                      title="Open Post on Platform"
                      icon={Icon.Globe}
                      url={postPermalink}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                    />
                  ) : null}
                  <Action.Push
                    title="View Post"
                    icon={Icon.Eye}
                    target={<PostDetail post={post} onChange={revalidate} />}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={() => revalidate()}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
