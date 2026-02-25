import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ItemMapping, QueueOption } from "../external-code/interfaces";
import MusicAssistantClient from "../music-assistant-client";
import { getSelectedQueueID } from "../use-selected-player-id";
import { getRecentlyPlayedIcon } from "./helpers";

interface RecentlyPlayedTabProps {
  client: MusicAssistantClient;
}

export function RecentlyPlayedTab({ client }: RecentlyPlayedTabProps) {
  const {
    isLoading,
    data: recentItems,
    revalidate,
  } = useCachedPromise(async () => await client.getRecentlyPlayedItems(30), [], {
    keepPreviousData: true,
  });

  const addToQueue = async (item: ItemMapping, itemName: string) => {
    const queueId = await getSelectedQueueID();
    if (!queueId) {
      return;
    }

    try {
      await client.playMedia(item, queueId, QueueOption.NEXT);
      await showToast({
        style: Toast.Style.Success,
        title: "Added to Queue",
        message: `"${itemName}" will play next`,
      });
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Add to Queue",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <List.Section title="Recently Played" subtitle={recentItems ? `${recentItems.length} item(s)` : undefined}>
      {isLoading && <List.Item title="Loading..." icon={Icon.Clock} />}

      {!isLoading && (!recentItems || recentItems.length === 0) && (
        <List.Item title="No recently played items" icon={Icon.XMarkCircle} />
      )}

      {!isLoading &&
        recentItems?.map((item, index) => (
          <List.Item
            key={`${item.item_id}-${index}`}
            title={item.name}
            subtitle={item.version || ""}
            icon={getRecentlyPlayedIcon(item.uri)}
            actions={
              <ActionPanel>
                <Action title="Add to Queue" icon={Icon.Plus} onAction={() => addToQueue(item, item.name)} />
              </ActionPanel>
            }
          />
        ))}
    </List.Section>
  );
}
