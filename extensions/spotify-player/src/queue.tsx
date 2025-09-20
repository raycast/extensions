import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { View } from "./components/View";
import TrackListItem from "./components/TrackListItem";
import EpisodeListItem from "./components/EpisodeListItem";
import { useQueue } from "./hooks/useQueue";
import { getErrorMessage } from "./helpers/getError";

function Queue() {
  const { queueData, queueError, queueIsLoading, queueRevalidate } = useQueue();

  if (queueError) {
    <List isLoading={queueIsLoading}>
      <List.EmptyView
        title="Unable to load devices"
        description={getErrorMessage(queueError)}
        actions={
          <ActionPanel>
            <Action
              icon={Icon.Repeat}
              title="Refresh"
              onAction={async () => queueRevalidate()}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel>
        }
      />
    </List>;
  }

  if (!queueData || queueData.length == 0) {
    return (
      <List isLoading={queueIsLoading}>
        <List.EmptyView
          title="Queue"
          description="Your queue is empty."
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Repeat}
                title="Refresh"
                onAction={async () => queueRevalidate()}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={queueIsLoading}>
      {queueData.map((queueItem, i) =>
        queueItem.type == "episode" ? (
          <EpisodeListItem episode={queueItem} key={`${queueItem.id}-${i}`} />
        ) : (
          <TrackListItem track={queueItem} album={queueItem.album} key={`${queueItem.id}-${i}`} />
        ),
      )}
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <Queue />
    </View>
  );
}
