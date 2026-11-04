import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { RenameForm } from "./rename-form";
import { allRooms, getGroups } from "./api";

export default function Command() {
  const { data, isLoading, revalidate, error } = useCachedPromise(async () => allRooms(await getGroups()), [], {
    keepPreviousData: true,
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Choose a room">
      {error && !data ? (
        <List.EmptyView icon={Icon.Warning} title="Sonos Not Reachable" description={error.message} />
      ) : null}
      {data?.map((room) => (
        <List.Item
          key={room.uuid}
          icon={Icon.Speaker}
          title={room.name}
          accessories={[{ text: room.ip }]}
          actions={
            <ActionPanel>
              <Action.Push title="Rename" icon={Icon.Pencil} target={<RenameForm room={room} onDone={revalidate} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
