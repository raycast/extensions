import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import { CreatePostForm } from "./create-post";
import { EmptyState } from "./components/EmptyState";
import { PostListItem } from "./components/PostListItem";
import { PostStatus } from "./lib/core";
import { useChannels, usePosts } from "./lib/hooks";

type Filter = "all" | PostStatus | "approval";

const FILTERS: { value: Filter; title: string }[] = [
  { value: "all", title: "All Posts" },
  { value: "scheduled", title: "Scheduled" },
  { value: "published", title: "Published" },
  { value: "draft", title: "Drafts" },
  { value: "failed", title: "Failed" },
  { value: "partial", title: "Partly Published" },
  { value: "approval", title: "Awaiting Approval" },
];

export default function Command() {
  return <PostSearch />;
}

export function PostSearch({ channelId, channelName }: { channelId?: number; channelName?: string }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [showingDetail, setShowingDetail] = useState(false);
  const { names } = useChannels();
  const { data, isLoading, pagination, revalidate, error } = usePosts({
    search: search.trim() || undefined,
    status: filter !== "all" && filter !== "approval" ? filter : undefined,
    approvalStatus: filter === "approval" ? "pending" : undefined,
    channelId,
    order: "desc",
  });

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail && data.length > 0}
      pagination={pagination}
      throttle
      filtering={false}
      onSearchTextChange={setSearch}
      navigationTitle={channelName ? `Posts on ${channelName}` : undefined}
      searchBarPlaceholder="Search post text"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Status" storeValue onChange={(v) => setFilter(v as Filter)}>
          {FILTERS.map((f) => (
            <List.Dropdown.Item key={f.value} title={f.title} value={f.value} />
          ))}
        </List.Dropdown>
      }
    >
      {error ? (
        <EmptyState error={error} onRetry={revalidate} />
      ) : (
        <>
          {data.map((post) => (
            <PostListItem
              key={post.id}
              post={post}
              channelNames={names}
              showingDetail={showingDetail}
              onToggleDetail={() => setShowingDetail((s) => !s)}
              onChange={revalidate}
            />
          ))}
          {!isLoading && data.length === 0 && (
            <List.EmptyView
              icon={Icon.MagnifyingGlass}
              title={search ? "No Matching Posts" : "No Posts Yet"}
              description={search ? "Try different words or another filter." : "Create your first post to see it here."}
              actions={
                <ActionPanel>
                  <Action.Push title="Create Post" icon={Icon.Plus} target={<CreatePostForm />} />
                </ActionPanel>
              }
            />
          )}
        </>
      )}
    </List>
  );
}
