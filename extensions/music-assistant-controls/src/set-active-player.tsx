import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import MusicAssistantClient from "./music-assistant-client";
import { useCachedPromise } from "@raycast/utils";

export default function SetActivePlayerCommand() {
  const client = new MusicAssistantClient();
  const {
    isLoading,
    data: queues,
    revalidate: revalidatePlayers,
  } = useCachedPromise(async () => await client.getActiveQueues(), [], {
    keepPreviousData: true,
    initialData: [],
  });

  const select = async (queue_id: string, display_name: string) => {
    await client.selectPlayer(queue_id, display_name);
  };

  return (
    <List isLoading={isLoading} navigationTitle="Set Active Player" searchBarPlaceholder="Search your active players">
      {queues?.map((queue) => (
        <List.Item
          title={queue.display_name}
          subtitle={queue.current_item?.name}
          icon={
            client.getQueueAlbumArt(queue)
              ? { source: client.getQueueAlbumArt(queue)!, mask: Image.Mask.RoundedRectangle }
              : Icon.Play
          }
          key={queue.queue_id}
          actions={
            <ActionPanel>
              <Action title="Select" onAction={() => select(queue.queue_id, queue.display_name)} />
              <Action title="Reload" onAction={() => revalidatePlayers()} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
