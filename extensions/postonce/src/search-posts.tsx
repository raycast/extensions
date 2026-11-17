import { Action, ActionPanel, Alert, Icon, Keyboard, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { showFailureToast, useCachedPromise, useCachedState } from "@raycast/utils";

import { DASHBOARD_URL, cancelPost, listPosts } from "./api";
import { Post, PostStatus } from "./types";
import { POST_STATUS_COLORS, canCancel, platformName } from "./utils";

const STATUS_FILTERS: { title: string; value: PostStatus | "all" }[] = [
  { title: "All Posts", value: "all" },
  { title: "Scheduled", value: "scheduled" },
  { title: "Published", value: "published" },
  { title: "Partly Published", value: "partial" },
  { title: "Failed", value: "failed" },
  { title: "Cancelled", value: "cancelled" },
];

const dashboardUrl = (post: Post) =>
  `${DASHBOARD_URL}/posts/${post.status === "scheduled" || post.status === "queued" ? "scheduled" : "published"}`;

export default function Command() {
  const [status, setStatus] = useCachedState<string>("status-filter", "all");

  const { data, isLoading, pagination, revalidate, mutate } = useCachedPromise(
    () => async (options: { cursor?: string }) => {
      const { data, meta } = await listPosts(options.cursor);
      const cursor = meta?.next_cursor || undefined;
      return { data, hasMore: Boolean(cursor), cursor };
    },
    [],
    { failureToastOptions: { title: "Could not load your posts" } },
  );

  const posts = (data || []).filter((post) => status === "all" || post.status === status);

  const cancel = async (post: Post) => {
    const confirmed = await confirmAlert({
      title: "Cancel this post?",
      message: "It will not be published. Anything already published stays online.",
      primaryAction: { title: "Cancel Post", style: Alert.ActionStyle.Destructive },
      dismissAction: { title: "Keep Post" },
    });
    if (!confirmed) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Cancelling post" });
    try {
      await mutate(cancelPost(post.id), {
        optimisticUpdate: (current) =>
          current?.map((item) => (item.id === post.id ? { ...item, status: "cancelled" } : item)),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Post cancelled";
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
      <List.EmptyView icon={Icon.Calendar} title="No posts here" />
      {posts.map((post) => {
        const publishedUrls = post.targets.filter((target) => target.platform_post_url);
        const date = post.publish_at || post.created_at;
        return (
          <List.Item
            key={post.id}
            icon={Icon.Message}
            title={post.content.split("\n")[0] || "(media only)"}
            subtitle={post.targets.map((target) => platformName(target.platform)).join(", ")}
            keywords={post.targets.map((target) => target.username || "").filter(Boolean)}
            accessories={[
              ...(date ? [{ date: new Date(date), tooltip: post.publish_at ? "Scheduled for" : "Created" }] : []),
              { tag: { value: post.status, color: POST_STATUS_COLORS[post.status] } },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in PostOnce" url={dashboardUrl(post)} />
                {canCancel(post.status) && (
                  <Action
                    title="Cancel Post"
                    icon={Icon.XMarkCircle}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => cancel(post)}
                  />
                )}
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
