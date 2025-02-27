import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { sortByScheduled } from "./utils";
import { usePublishedPosts } from "./postowl";

export default function Command() {
  const { data, isLoading } = usePublishedPosts();

  return (
    <List isLoading={isLoading}>
      {data?.sort(sortByScheduled).map((draft, index) => (
        <List.Item
          key={draft.id}
          title={draft.posts[0].content}
          accessories={[
            {
              icon: draft.posts.length > 1 ? Icon.Message : undefined,
              tooltip: draft.posts.length > 1 ? `Tweets: ${draft.posts.length}` : undefined,
            },
            {
              icon: draft.posted_at ? Icon.Clock : undefined,
              date: draft.posted_at ? new Date(draft.posted_at) : undefined,
              tooltip: draft.posted_at ? `Published on: ${new Date(draft.posted_at).toLocaleString()}` : undefined,
            },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={draft.url ?? ""} title="Open in Browser" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
