import { Action, ActionPanel, Icon, List } from "@raycast/api";
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
      {queues?.map(({ queue_id, display_name, current_item }) => (
        <List.Item
          title={display_name}
          subtitle={current_item?.name}
          icon={Icon.Play}
          key={queue_id}
          actions={
            <ActionPanel>
              <Action title="Select" onAction={() => select(queue_id, display_name)} />
              <Action title="Reload" onAction={() => revalidatePlayers()} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
