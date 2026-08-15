import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ItemMapping } from "../music-assistant/external-code/interfaces";
import MusicAssistantClient from "../music-assistant/music-assistant-client";
import { addItemToQueueNext } from "./actions";
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
    await addItemToQueueNext(client, item, itemName, revalidate);
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
