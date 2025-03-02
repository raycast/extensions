import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { sortByScheduled } from "./utils";
import { useScheduledPosts } from "./postowl";

export default function Command() {
  const { data, isLoading } = useScheduledPosts();

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
              icon: draft.scheduled_for ? Icon.Clock : undefined,
              date: draft.scheduled_for ? new Date(draft.scheduled_for) : undefined,
              tooltip: draft.scheduled_for
                ? `Scheduled at: ${new Date(draft.scheduled_for).toLocaleString()}`
                : undefined,
            },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={`https://postowl.io/dashboard/playground/craft?existingTweet=${draft.id}`}
                title="Open in Browser"
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
