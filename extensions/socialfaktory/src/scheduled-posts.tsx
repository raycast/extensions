import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";
import { useRef, useState } from "react";
import { SignInAgainAction } from "./components/sign-in-again";
import { SITE_URL, authorize, personalToken } from "./lib/auth";
import { firstLine, metricName, platformName, postText, statusName } from "./lib/format";
import { listPosts } from "./lib/socialfaktory";
import type { Post, PostStatus } from "./lib/types";

type Filter = PostStatus | "all";

const FILTERS: Filter[] = ["scheduled", "queued", "published", "failed", "draft", "all"];

const STATUS_COLORS: Record<PostStatus, Color> = {
  draft: Color.SecondaryText,
  queued: Color.Orange,
  scheduled: Color.Blue,
  published: Color.Green,
  failed: Color.Red,
};

const STATUS_ICONS: Record<PostStatus, Icon> = {
  draft: Icon.Pencil,
  queued: Icon.Clock,
  scheduled: Icon.Calendar,
  published: Icon.CheckCircle,
  failed: Icon.XMarkCircle,
};

function ScheduledPosts() {
  const [filter, setFilter] = useState<Filter>("scheduled");
  const abortable = useRef<AbortController>(null);
  const { data, isLoading, pagination, revalidate } = useCachedPromise(
    (status: Filter) => async (options: { page: number }) => {
      const result = await listPosts(
        { status: status === "all" ? undefined : status, page: options.page + 1 },
        abortable.current?.signal,
      );
      return { data: result.posts, hasMore: result.page < result.pages };
    },
    [filter],
    { abortable, keepPreviousData: true, failureToastOptions: { title: "Could not load your posts" } },
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={(data?.length ?? 0) > 0}
      pagination={pagination}
      searchBarPlaceholder="Filter posts by caption or platform"
      searchBarAccessory={
        <List.Dropdown tooltip="Status" storeValue onChange={(value) => setFilter(value as Filter)}>
          {FILTERS.map((value) => (
            <List.Dropdown.Item key={value} value={value} title={value === "all" ? "All Posts" : statusName(value)} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Calendar}
        title={filter === "all" ? "No posts yet" : `No ${statusName(filter).toLowerCase()} posts`}
        description="Posts you schedule in SocialFaktory show up here."
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open SocialFaktory" url={SITE_URL} />
            <SignInAgainAction onSignedIn={revalidate} />
          </ActionPanel>
        }
      />
      {data?.map((post) => (
        <PostItem key={post.id} post={post} onRefresh={revalidate} />
      ))}
    </List>
  );
}

function PostItem({ post, onRefresh }: { post: Post; onRefresh: () => void }) {
  const text = postText(post);
  const platform = platformName(post.provider);
  const metrics = Object.entries(post.metrics ?? {});

  return (
    <List.Item
      title={firstLine(text, "Untitled post")}
      keywords={[platform, statusName(post.status)]}
      icon={{ source: STATUS_ICONS[post.status] ?? Icon.Circle, tintColor: STATUS_COLORS[post.status] }}
      detail={
        <List.Item.Detail
          markdown={text || "_No caption_"}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.TagList title="Status">
                <List.Item.Detail.Metadata.TagList.Item
                  text={statusName(post.status)}
                  color={STATUS_COLORS[post.status]}
                />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Label title="Platform" text={platform} />
              {post.scheduled_at && (
                <List.Item.Detail.Metadata.Label title="Scheduled" text={formatDate(post.scheduled_at)} />
              )}
              {post.published_at && (
                <List.Item.Detail.Metadata.Label title="Published" text={formatDate(post.published_at)} />
              )}
              {post.release_url && (
                <List.Item.Detail.Metadata.Link title="Link" text="Open post" target={post.release_url} />
              )}
              {post.failure_code && (
                <List.Item.Detail.Metadata.Label title="Failure" text={metricName(post.failure_code)} />
              )}
              {metrics.length > 0 && <List.Item.Detail.Metadata.Separator />}
              {metrics.map(([key, value]) => (
                <List.Item.Detail.Metadata.Label
                  key={key}
                  title={metricName(key)}
                  text={value.toLocaleString("en-US")}
                />
              ))}
              {post.metrics_synced_at && (
                <List.Item.Detail.Metadata.Label title="Metrics Updated" text={formatDate(post.metrics_synced_at)} />
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {post.release_url && <Action.OpenInBrowser title="Open Post" url={post.release_url} />}
          {text && <Action.CopyToClipboard title="Copy Caption" content={text} />}
          {post.release_url && (
            <Action.CopyToClipboard
              title="Copy Post Link"
              content={post.release_url}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          )}
          <Action.OpenInBrowser title="Open SocialFaktory" url={SITE_URL} />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />
          <SignInAgainAction onSignedIn={onRefresh} />
        </ActionPanel>
      }
    />
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default withAccessToken({ authorize, personalAccessToken: personalToken() })(ScheduledPosts);
