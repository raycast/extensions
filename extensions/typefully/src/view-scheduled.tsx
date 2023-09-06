import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getIcon, sortByScheduled } from "./utils";
import { useScheduledDrafts } from "./typefully";

export default function Command() {
  const { data, isLoading } = useScheduledDrafts();

  return (
    <List isLoading={isLoading}>
      {data?.sort(sortByScheduled).map((draft, index) => (
        <List.Item
          key={draft.id}
          icon={getIcon(index + 1)}
          title={draft.text_first_tweet}
          accessories={[
            {
              icon: draft.num_tweets > 1 ? Icon.SpeechBubbleActive : undefined,
              tooltip: draft.num_tweets > 1 ? `Tweets: ${draft.num_tweets}` : undefined,
            },
            {
              icon: draft.scheduled_date ? Icon.Clock : undefined,
              date: draft.scheduled_date ? new Date(draft.scheduled_date) : undefined,
              tooltip: draft.scheduled_date
                ? `Scheduled at: ${new Date(draft.scheduled_date).toLocaleString()}`
                : undefined,
            },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://typefully.com/?d=${draft.id}`} title="Open Draft in Typefully" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
