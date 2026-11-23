import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { CreatePostForm } from "./create-post";
import { EmptyState } from "./components/EmptyState";
import { PostListItem } from "./components/PostListItem";
import { nextQueueSlot } from "./lib/api";
import { APP_URL, Post } from "./lib/core";
import { useChannels, usePosts } from "./lib/hooks";
import { dayLabel, formatDateTime, localTimeZone } from "./lib/ui";

export default function Command() {
  const [showingDetail, setShowingDetail] = useState(false);
  const { names } = useChannels();
  const { data, isLoading, pagination, revalidate, error } = usePosts({ status: "scheduled", order: "asc", limit: 50 });
  const slot = usePromise(nextQueueSlot, [localTimeZone()], {
    // No queue times set up is a normal state, not an error worth a toast.
    onError: () => undefined,
  });

  const days = useMemo(() => groupByDay(data), [data]);
  const refresh = () => {
    revalidate();
    slot.revalidate();
  };

  return (
    <List
      isLoading={isLoading || slot.isLoading}
      isShowingDetail={showingDetail && data.length > 0}
      pagination={pagination}
      searchBarPlaceholder="Filter scheduled posts"
    >
      {error ? (
        <EmptyState error={error} onRetry={refresh} />
      ) : (
        <>
          {slot.data && (
            <List.Section title="Up Next">
              <List.Item
                title="Next Free Queue Slot"
                icon={{ source: Icon.Plus, tintColor: Color.Orange }}
                accessories={[{ text: formatDateTime(slot.data), tooltip: "Posts you add to the queue go out here" }]}
                detail={
                  <List.Item.Detail
                    markdown={`Posts added to your queue will go out at **${formatDateTime(slot.data)}**.`}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Create Post"
                      icon={Icon.Plus}
                      target={<CreatePostForm navigationTitle="Create Post" />}
                    />
                    <Action.OpenInBrowser title="Open Calendar" icon={Icon.Calendar} url={`${APP_URL}/calendar`} />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={refresh}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}
          {days.map(([day, posts]) => (
            <List.Section key={day} title={day} subtitle={`${posts.length} post${posts.length === 1 ? "" : "s"}`}>
              {posts.map((post) => (
                <PostListItem
                  key={post.id}
                  post={post}
                  channelNames={names}
                  showingDetail={showingDetail}
                  onToggleDetail={() => setShowingDetail((s) => !s)}
                  onChange={refresh}
                  timeOnly
                />
              ))}
            </List.Section>
          ))}
          {!isLoading && data.length === 0 && (
            <List.EmptyView
              icon={Icon.Calendar}
              title="Nothing Scheduled"
              description="Create a post and add it to your queue."
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Create Post"
                    icon={Icon.Plus}
                    target={<CreatePostForm navigationTitle="Create Post" />}
                  />
                </ActionPanel>
              }
            />
          )}
        </>
      )}
    </List>
  );
}

function groupByDay(posts: Post[]): [string, Post[]][] {
  const groups = new Map<string, Post[]>();
  for (const p of posts) {
    const key = p.scheduledAt ? dayLabel(p.scheduledAt) : "No Date";
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  return [...groups.entries()];
}
