import { List, Icon, ActionPanel, Action } from "@raycast/api"
import { useBirdCommand } from "./hooks/useBirdCommand"
import { TweetItem } from "./components/TweetItem"

export default function LikesCommand() {
  const {
    data: tweets,
    isLoading,
    error,
    loadMore,
    canLoadMore,
    maxCount,
  } = useBirdCommand("likes")

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search likes..."
      isShowingDetail
      navigationTitle={`Likes (${tweets.length}${canLoadMore ? `/${maxCount}` : ""})`}
    >
      {error ? (
        <List.EmptyView
          title="Failed to load likes"
          description={error.message}
        />
      ) : (
        <>
          {tweets?.map((tweet) => (
            <TweetItem
              key={tweet.id}
              tweet={tweet}
              loadMore={loadMore}
              canLoadMore={canLoadMore}
            />
          ))}
          {canLoadMore && (
            <List.Item
              title="Load More..."
              subtitle={`Showing ${tweets.length} of ${maxCount}`}
              icon={Icon.Download}
              actions={
                <ActionPanel>
                  <Action
                    title="Load More"
                    icon={Icon.Download}
                    onAction={loadMore}
                  />
                </ActionPanel>
              }
            />
          )}
        </>
      )}
    </List>
  )
}
