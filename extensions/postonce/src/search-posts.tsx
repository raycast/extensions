import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise, useCachedState } from "@raycast/utils";

import { DASHBOARD_URL, cancelPost, listPosts } from "./api";
import { Post, PostStatus } from "./types";
import { POST_STATUS_COLORS, POST_STATUS_LABELS, canCancel, platformName } from "./utils";

const STATUS_FILTERS: { title: string; value: PostStatus | "all" }[] = [
  { title: "All Posts", value: "all" },
  { title: "Scheduled", value: "scheduled" },
  { title: "Published", value: "published" },
  { title: "Partly Published", value: "partial" },
  { title: "Failed", value: "failed" },
  { title: "Canceled", value: "cancelled" },
];

const PAGE_SIZE = 25;

const dashboardUrl = (post: Post) =>
  `${DASHBOARD_URL}/posts/${post.status === "scheduled" || post.status === "queued" ? "scheduled" : "published"}`;

export default function Command() {
  const [status, setStatus] = useCachedState<string>("status-filter", "all");

  const { data, isLoading, error, pagination, revalidate, mutate } = useCachedPromise(
    (status: string) => async (options: { cursor?: string }) => {
      // The API has no status filter, so keep paging until a page of matches or the end
      const matches: Post[] = [];
      let cursor = options.cursor;
      do {
        const { data, meta } = await listPosts(cursor);
        matches.push(...data.filter((post) => status === "all" || post.status === status));
        cursor = meta?.next_cursor || undefined;
      } while (cursor && matches.length < PAGE_SIZE);
      return { data: matches, hasMore: Boolean(cursor), cursor };
    },
    [status],
    { failureToastOptions: { title: "Could not load your posts" } },
  );

  const posts = data || [];

  const cancel = async (post: Post) => {
    const confirmed = await confirmAlert({
      title: "Cancel this post?",
      message: "It will not be published. Anything already published stays online.",
      primaryAction: { title: "Cancel Post", style: Alert.ActionStyle.Destructive },
      dismissAction: { title: "Keep Post" },
    });
    if (!confirmed) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Canceling post" });
    try {
      await mutate(cancelPost(post.id), {
        optimisticUpdate: (current) =>
          current?.map((item) => (item.id === post.id ? { ...item, status: "cancelled" } : item)),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Post canceled";
    } catch (error) {
      await showFailureToast(error, { title: "Could not cancel post" });
    }
  };

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      searchBarPlaceholder="Search posts"
      searchBarAccessory={
        <List.Dropdown tooltip="Status" value={status} onChange={setStatus}>
          {STATUS_FILTERS.map((filter) => (
            <List.Dropdown.Item key={filter.value} title={filter.title} value={filter.value} />
          ))}
        </List.Dropdown>
      }
    >
      {error && posts.length === 0 ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not load your posts"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView icon={Icon.Calendar} title="No posts here" />
      )}
      {posts.map((post) => {
        const publishedUrls = post.targets.filter((target) => target.platform_post_url);
        const date = post.publish_at || post.created_at;
        return (
          <List.Item
            key={post.id}
            icon={Icon.Message}
            title={post.content.split("\n")[0] || "(media only)"}
            subtitle={post.targets.map((target) => platformName(target.platform)).join(", ")}
            keywords={[post.content, ...post.targets.map((target) => target.username || "").filter(Boolean)]}
            accessories={[
              ...(date ? [{ date: new Date(date), tooltip: post.publish_at ? "Scheduled for" : "Created" }] : []),
              {
                tag: { value: POST_STATUS_LABELS[post.status] || post.status, color: POST_STATUS_COLORS[post.status] },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in PostOnce" url={dashboardUrl(post)} />
                {publishedUrls.length > 0 && (
                  <ActionPanel.Section title="Published Posts">
                    {publishedUrls.map((target) => (
                      <Action.OpenInBrowser
                        key={target.target_post_id}
                        title={`Open on ${platformName(target.platform)}`}
                        url={target.platform_post_url as string}
                      />
                    ))}
                  </ActionPanel.Section>
                )}
                <ActionPanel.Section>
                  <Action.CopyToClipboard title="Copy Text" content={post.content} />
                  {canCancel(post.status) && (
                    <Action
                      title="Cancel Post"
                      icon={Icon.XMarkCircle}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      onAction={() => cancel(post)}
                    />
                  )}
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
