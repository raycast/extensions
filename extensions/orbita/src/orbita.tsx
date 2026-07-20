import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchOrbitaPosts } from "./get-rss";
import { formatRelativeDate } from "./utils";

export default function Command() {
  const { isLoading, data, error, revalidate } = useCachedPromise(fetchOrbitaPosts);
  const posts = data || [];

  return (
    <List isLoading={isLoading}>
      {error && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error fetching posts"
          description={error.message || "It was not possible to fetch the Órbita RSS feed"}
        />
      )}

      {!error && posts.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Document}
          title="No posts found"
          description="The Órbita feed is empty at the moment"
        />
      )}

      {!error &&
        posts.map((post) => (
          <List.Item
            key={post.id}
            icon={Icon.Eye}
            title={post.title}
            subtitle={post.author || ""}
            accessories={[
              {
                text: formatRelativeDate(post.pubDate),
                icon: Icon.Clock,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={post.link} />
                <Action
                  title="Reload Feed"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => revalidate()}
                />
                <Action.CopyToClipboard
                  title="Copy Link"
                  content={post.link}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
