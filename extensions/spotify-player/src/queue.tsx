import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { View } from "./components/View";
import { useQueue } from "./hooks/useQueue";
import { getErrorMessage } from "./helpers/getError";
import { ImageObject } from "./helpers/spotify.api";

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
      {queueData.map((queueItem) => {
        let subtitle: string | undefined = undefined;
        let iconImages: ImageObject[] | undefined = undefined;
        if (queueItem.type == "track") {
          subtitle = queueItem?.artists?.map((a) => a.name).join(", ");
          if (queueItem.album?.images) iconImages = queueItem.album.images;
        } else if (queueItem.type == "episode") {
          if (queueItem.images) iconImages = queueItem.show.images;
          else if (queueItem.show?.images) iconImages = queueItem.show.images;
        }

        return (
          <List.Item
            key={queueItem.id}
            title={queueItem.name ?? "Unknown"}
            subtitle={subtitle}
            icon={iconImages ? { source: iconImages[iconImages.length - 1]?.url } : undefined}
          />
        );
      })}
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
