import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { LoadErrorView } from "./load-error-view";
import { api } from "../lib/api";
import { APP_URL } from "../lib/client";
import { runWithToast } from "../lib/feedback";
import {
  appUrlForPost,
  editorUrlForPost,
  formatDateTime,
  localTimezone,
  PLATFORM_LABELS,
  POST_STATUS_LABELS,
  postDate,
  postImage,
  postTitle,
  publishedLink,
} from "../lib/format";
import { PlatformPostStatus, Post, PostStatus } from "../lib/types";

type StatusFilter = PostStatus | "ALL";

const PAGE_SIZE = 25;

const STATUS_FILTERS: PostStatus[] = ["DRAFT", "SCHEDULED", "PUBLISHING", "COMPLETED", "PARTIAL_FAILURE", "FAILED"];

const STATUS_COLORS: Record<PostStatus, Color> = {
  DRAFT: Color.SecondaryText,
  SCHEDULED: Color.Blue,
  PENDING: Color.Blue,
  PUBLISHING: Color.Purple,
  COMPLETED: Color.Green,
  PARTIAL_FAILURE: Color.Orange,
  FAILED: Color.Red,
};

const PLATFORM_STATUS_COLORS: Record<PlatformPostStatus, Color> = {
  PENDING: Color.Blue,
  PUBLISHING: Color.Purple,
  PUBLISHED: Color.Green,
  FAILED: Color.Red,
};

function postMarkdown(post: Post): string {
  const image = postImage(post);
  return [post.text ?? "", image ? `![Post media](${image})` : ""].filter(Boolean).join("\n\n");
}

function PostDetail({ post }: { post: Post }) {
  const failures = post.platforms.filter((platform) => platform.errorMessage);
  return (
    <List.Item.Detail
      markdown={postMarkdown(post)}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item
              text={POST_STATUS_LABELS[post.status]}
              color={STATUS_COLORS[post.status]}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label title="Date" text={formatDateTime(postDate(post))} />
          <List.Item.Detail.Metadata.Separator />
          {post.platforms.map((platform) =>
            platform.postUrl ? (
              <List.Item.Detail.Metadata.Link
                key={platform.id}
                title={PLATFORM_LABELS[platform.platform]}
                text={platform.accountName ?? "Open Post"}
                target={platform.postUrl}
              />
            ) : (
              <List.Item.Detail.Metadata.Label
                key={platform.id}
                title={PLATFORM_LABELS[platform.platform]}
                text={{
                  value: platform.accountName ?? platform.status,
                  color: PLATFORM_STATUS_COLORS[platform.status],
                }}
              />
            ),
          )}
          {failures.length > 0 && <List.Item.Detail.Metadata.Separator />}
          {failures.map((platform) => (
            <List.Item.Detail.Metadata.Label
              key={`${platform.id}-error`}
              title={`${PLATFORM_LABELS[platform.platform]} Error`}
              text={platform.errorMessage}
            />
          ))}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

type PostListProps = {
  draftsOnly?: boolean;
};

export function PostList({ draftsOnly = false }: PostListProps) {
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("ALL");
  const status: StatusFilter = draftsOnly ? "DRAFT" : selectedStatus;
  const { data, isLoading, error, pagination, revalidate } = useCachedPromise(
    (statusFilter: StatusFilter) =>
      async ({ page }: { page: number }) => {
        const result = await api().listPosts({
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
          statuses: statusFilter === "ALL" ? undefined : [statusFilter],
        });
        return { data: result.posts, hasMore: result.hasMore };
      },
    [status],
    {
      keepPreviousData: true,
      failureToastOptions: { title: draftsOnly ? "Could Not Load Drafts" : "Could Not Load Posts" },
    },
  );

  const publishNow = async (post: Post) => {
    const confirmed = await confirmAlert({
      title: "Publish Draft Now?",
      message: postTitle(post),
      icon: Icon.Upload,
      primaryAction: { title: "Publish" },
    });
    if (!confirmed) return;
    await runWithToast(
      { pending: "Publishing Draft", success: "Draft Queued for Publishing", failure: "Could Not Publish Draft" },
      () => api().publishDraft(post.id, localTimezone()),
    );
    revalidate();
  };

  const unschedule = async (post: Post) => {
    await runWithToast(
      { pending: "Unscheduling Post", success: "Moved to Drafts", failure: "Could Not Unschedule Post" },
      () => api().unschedulePost(post.id),
    );
    revalidate();
  };

  const retry = async (post: Post) => {
    await runWithToast(
      { pending: "Retrying Failed Platforms", success: "Retry Queued", failure: "Could Not Retry Post" },
      () => api().retryFailedPlatforms(post.id),
    );
    revalidate();
  };

  const remove = async (post: Post) => {
    const confirmed = await confirmAlert({
      title: "Delete Post?",
      message: postTitle(post),
      icon: Icon.Trash,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await runWithToast({ pending: "Deleting Post", success: "Post Deleted", failure: "Could Not Delete Post" }, () =>
      api().deletePost(post.id),
    );
    revalidate();
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      pagination={pagination}
      searchBarPlaceholder={draftsOnly ? "Search loaded drafts" : "Search loaded posts"}
      searchBarAccessory={
        draftsOnly ? undefined : (
          <List.Dropdown
            tooltip="Filter by Status"
            storeValue
            onChange={(value) => setSelectedStatus(value as StatusFilter)}
          >
            <List.Dropdown.Item title="All Posts" value="ALL" />
            {STATUS_FILTERS.map((value) => (
              <List.Dropdown.Item key={value} title={POST_STATUS_LABELS[value]} value={value} />
            ))}
          </List.Dropdown>
        )
      }
    >
      {error && !data?.length ? (
        <LoadErrorView
          title={draftsOnly ? "Could Not Load Drafts" : "Could Not Load Posts"}
          error={error}
          onRetry={revalidate}
        />
      ) : (
        <List.EmptyView
          icon={Icon.Document}
          title={draftsOnly ? "No Drafts" : "No Posts Found"}
          description={draftsOnly ? "Posts you save as drafts show up here." : undefined}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Composer" url={`${APP_URL}/create-post`} />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      )}
      {data?.map((post) => {
        const link = publishedLink(post);
        return (
          <List.Item
            key={post.id}
            title={postTitle(post)}
            keywords={[
              ...(post.text?.split(/\s+/).slice(0, 80) ?? []),
              ...post.platforms.flatMap((platform) => [PLATFORM_LABELS[platform.platform], platform.accountName ?? ""]),
            ]}
            icon={{ source: Icon.CircleFilled, tintColor: STATUS_COLORS[post.status] }}
            detail={<PostDetail post={post} />}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {post.status === "DRAFT" && (
                    <Action.OpenInBrowser title="Edit in AdaptlyPost" icon={Icon.Pencil} url={editorUrlForPost(post)} />
                  )}
                  {link && <Action.OpenInBrowser title="Open Published Post" url={link} />}
                  <Action.OpenInBrowser title="Open in AdaptlyPost" url={appUrlForPost(post)} />
                  {post.text && <Action.CopyToClipboard title="Copy Text" content={post.text} />}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  {post.status === "DRAFT" && (
                    <Action title="Publish Now" icon={Icon.Upload} onAction={() => publishNow(post)} />
                  )}
                  {post.status === "SCHEDULED" && (
                    <Action title="Unschedule Post" icon={Icon.Calendar} onAction={() => unschedule(post)} />
                  )}
                  {(post.status === "FAILED" || post.status === "PARTIAL_FAILURE") && (
                    <Action title="Retry Failed Platforms" icon={Icon.RotateClockwise} onAction={() => retry(post)} />
                  )}
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                  <Action
                    title="Delete Post"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => remove(post)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
