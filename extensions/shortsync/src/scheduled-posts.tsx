import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";

import {
  APP_LINKS,
  cancelPost,
  FAILED_LOOKBACK_DAYS,
  listConnections,
  listFailedPosts,
  listScheduledPosts,
  publishPostNow,
  retryPost,
} from "./lib/api";
import { ErrorEmptyView, showErrorToast } from "./lib/errors";
import { formatWhen, postText, truncate } from "./lib/format";
import { platformIcon, platformName } from "./lib/platforms";
import { POST_STATUS, type Connection, type Post } from "./lib/types";

const VIEW = { Scheduled: "scheduled", Failed: "failed" } as const;
type View = (typeof VIEW)[keyof typeof VIEW];

const PAGE_SIZE = 50;

export default function ScheduledPosts() {
  const [view, setView] = useState<View>(VIEW.Scheduled);

  const { data: connections = [] } = useCachedPromise(listConnections, [], { keepPreviousData: true });
  const byId = useMemo(() => new Map(connections.map((c) => [c.id, c])), [connections]);

  const {
    data: posts = [],
    isLoading,
    error,
    pagination,
    revalidate,
    mutate,
  } = useCachedPromise(
    (v: View) => async (options: { cursor?: string }) => {
      const res =
        v === VIEW.Failed
          ? await listFailedPosts(PAGE_SIZE, options.cursor)
          : await listScheduledPosts(PAGE_SIZE, options.cursor);
      const next = res.pagination?.next_cursor ?? undefined;
      return { data: res.data, hasMore: !!next, cursor: next };
    },
    [view],
    { keepPreviousData: true },
  );

  async function runAction(post: Post, label: string, action: () => Promise<unknown>, successTitle: string) {
    const toast = await showToast({ style: Toast.Style.Animated, title: label });
    try {
      await mutate(action(), {
        optimisticUpdate: (current) => current?.filter((p) => p.id !== post.id),
      });
      toast.style = Toast.Style.Success;
      toast.title = successTitle;
    } catch (err) {
      await showErrorToast(err, toast);
    }
  }

  async function onPublishNow(post: Post) {
    const ok = await confirmAlert({
      title: "Publish this post now?",
      message: `It goes out to ${accountName(post, byId)} right away instead of ${formatWhen(post.scheduled_for)}.`,
      primaryAction: { title: "Publish Now" },
    });
    if (ok) await runAction(post, "Publishing", () => publishPostNow(post.id), "Publishing now");
  }

  async function onRetry(post: Post) {
    await runAction(post, "Retrying", () => retryPost(post.id), "Post queued again");
  }

  async function onCancel(post: Post) {
    const failed = post.status === POST_STATUS.Failed;
    const ok = await confirmAlert({
      title: failed ? "Remove this failed post?" : "Cancel this scheduled post?",
      message: failed
        ? "It's removed from your failed posts. Nothing is published."
        : `It won't be published to ${accountName(post, byId)}. Your media stays in the ShortSync library.`,
      icon: Icon.Trash,
      primaryAction: { title: failed ? "Remove Post" : "Cancel Post", style: Alert.ActionStyle.Destructive },
      dismissAction: { title: failed ? "Keep" : "Keep Scheduled" },
    });
    if (ok) await runAction(post, "Cancelling", () => cancelPost(post.id), failed ? "Post removed" : "Post cancelled");
  }

  const isFailedView = view === VIEW.Failed;

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      isShowingDetail={posts.length > 0}
      searchBarPlaceholder={isFailedView ? "Search failed posts" : "Search scheduled posts"}
      searchBarAccessory={
        <List.Dropdown tooltip="Show" value={view} onChange={(v) => setView(v as View)}>
          <List.Dropdown.Item value={VIEW.Scheduled} title="Scheduled" icon={Icon.Calendar} />
          <List.Dropdown.Item value={VIEW.Failed} title="Failed" icon={Icon.ExclamationMark} />
        </List.Dropdown>
      }
    >
      {error && posts.length === 0 ? (
        <ErrorEmptyView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={isFailedView ? Icon.CheckCircle : Icon.Calendar}
          title={isFailedView ? "No failed posts" : "Nothing scheduled"}
          description={
            isFailedView
              ? `No posts failed in the last ${FAILED_LOOKBACK_DAYS} days.`
              : "Schedule a post and it shows up here."
          }
          actions={
            <ActionPanel>
              <Action title="Create Post" icon={Icon.Plus} onAction={openCreatePost} />
              <Action.OpenInBrowser title="Open ShortSync" url={APP_LINKS.dashboard()} />
            </ActionPanel>
          }
        />
      )}

      {posts.map((post) => {
        const text = postText(post);
        const connection = byId.get(post.connection_id);
        const when = isFailedView ? formatWhen(post.scheduled_for ?? post.created_at) : formatWhen(post.scheduled_for);
        return (
          <List.Item
            key={post.id}
            icon={platformIcon(post.platform)}
            title={text ? truncate(text, 60) : "No caption"}
            keywords={[platformName(post.platform), connection?.display_name ?? ""].filter(Boolean)}
            accessories={
              isFailedView
                ? [{ icon: { source: Icon.ExclamationMark, tintColor: Color.Red }, tooltip: post.error?.message }]
                : [{ text: when }]
            }
            detail={<PostDetail post={post} connection={connection} />}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    title="Open in ShortSync"
                    url={isFailedView ? APP_LINKS.failed() : APP_LINKS.scheduled()}
                  />
                  {isFailedView ? (
                    <Action title="Retry Now" icon={Icon.ArrowClockwise} onAction={() => onRetry(post)} />
                  ) : (
                    <Action title="Publish Now" icon={Icon.Upload} onAction={() => onPublishNow(post)} />
                  )}
                  {text ? <Action.CopyToClipboard title="Copy Caption" content={text} /> : null}
                  {isFailedView && post.error?.message ? (
                    <Action.CopyToClipboard title="Copy Error" content={post.error.message} />
                  ) : null}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title={isFailedView ? "Remove Failed Post" : "Cancel Post"}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => onCancel(post)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Create Post"
                    icon={Icon.Plus}
                    shortcut={Keyboard.Shortcut.Common.New}
                    onAction={openCreatePost}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
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

function PostDetail({ post, connection }: { post: Post; connection?: Connection }) {
  const text = postText(post);
  const markdown = [post.title && post.caption ? `**${post.title}**` : "", text || "_No caption_"]
    .filter(Boolean)
    .join("\n\n");
  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Platform"
            text={platformName(post.platform)}
            icon={platformIcon(post.platform)}
          />
          {connection?.display_name ? (
            <List.Item.Detail.Metadata.Label title="Account" text={connection.display_name} />
          ) : null}
          {post.status === POST_STATUS.Failed ? (
            <>
              <List.Item.Detail.Metadata.TagList title="Status">
                <List.Item.Detail.Metadata.TagList.Item text="Failed" color={Color.Red} />
              </List.Item.Detail.Metadata.TagList>
              {post.error?.message ? <List.Item.Detail.Metadata.Label title="Error" text={post.error.message} /> : null}
              <List.Item.Detail.Metadata.Label title="Created" text={formatWhen(post.created_at)} />
            </>
          ) : (
            <>
              <List.Item.Detail.Metadata.Label title="Scheduled For" text={formatWhen(post.scheduled_for)} />
              {post.moved?.original_scheduled_for ? (
                <List.Item.Detail.Metadata.Label
                  title="Moved From"
                  text={`${formatWhen(post.moved.original_scheduled_for)} (daily limit)`}
                />
              ) : null}
            </>
          )}
          <List.Item.Detail.Metadata.Label title="Media" text={post.upload_id ? "Image or video" : "Text only"} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function accountName(post: Post, byId: Map<string, Connection>): string {
  const connection = byId.get(post.connection_id);
  const platform = platformName(post.platform);
  return connection?.display_name ? `${platform} (${connection.display_name})` : platform;
}

function openCreatePost() {
  return launchCommand({ name: "create-post", type: LaunchType.UserInitiated });
}
