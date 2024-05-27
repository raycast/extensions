import { List, Action, ActionPanel, Icon, Image, Color, closeMainWindow, PopToRootType, popToRoot } from "@raycast/api";
import { Room, copyCallLink, getRooms, joinRoom } from "./lib/multi";
import { useCachedPromise } from "@raycast/utils";
import { showMultiScriptErrorToastAndLogError } from "./lib/showMultiScriptErrorToastAndLogError";

export default function Command() {
  const { isLoading, data } = useCachedPromise(
    async () => {
      const response = await getRooms();
      return response.rooms;
    },
    [],
    {
      onError: (error) => {
        showMultiScriptErrorToastAndLogError(error, "getRooms");
      },
    },
  );

  return (
    <List isLoading={isLoading}>
      {data === undefined || data.length === 0 ? (
        <List.EmptyView title={isLoading ? "Loading..." : "No rooms found"} />
      ) : (
        data.map((room) => (
          <List.Item
            key={room.id}
            title={room.name}
            icon={getIcon(room)}
            accessories={getAccessories(room)}
            actions={getActions(room)}
          />
        ))
      )}
    </List>
  );
}

function getIcon(room: Room): Image {
  return {
    source: Icon.Circle,
    tintColor: room.participants.length > 0 ? Color.Green : Color.SecondaryText,
  };
}

function getAccessories(room: Room): List.Item.Accessory[] {
  return [{ text: participantsLabel(room.participants.length) }];
}

function participantsLabel(count: number) {
  if (count === 1) {
    return `1 participant`;
  }

  return `${count} participants`;
}

function getActions(room: Room): React.ReactNode {
  return (
    <ActionPanel>
      <Action
        title={`Join ${room.name}`}
        icon={Icon.AddPerson}
        onAction={() => {
          join(room);
        }}
      />
      <Action
        title={`Copy Link`}
        icon={Icon.CopyClipboard}
        onAction={() => {
          copyLink(room);
        }}
      />
    </ActionPanel>
  );
}

async function join(room: Room) {
  const closeMainWindowPromise = closeMainWindow({ popToRootType: PopToRootType.Suspended });
  await joinRoom(room.id);
  await closeMainWindowPromise;
  await popToRoot({ clearSearchBar: true });
}

async function copyLink(room: Room) {
  const closeMainWindowPromise = closeMainWindow({ popToRootType: PopToRootType.Suspended });
  await copyCallLink(room.id);
  await closeMainWindowPromise;
  await popToRoot({ clearSearchBar: true });
}
