import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getIcon, sortByScheduled } from "./utils";
import { usePublishedDrafts } from "./typefully";

export default function Command() {
  const { data, isLoading } = usePublishedDrafts();

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
              icon: draft.published_on ? Icon.Clock : undefined,
              date: draft.published_on ? new Date(draft.published_on) : undefined,
              tooltip: draft.published_on
                ? `Published on: ${new Date(draft.published_on).toLocaleString()}`
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
