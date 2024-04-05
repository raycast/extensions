import { List, Action, ActionPanel, Icon, Color, closeMainWindow, PopToRootType } from "@raycast/api";
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

function getIcon(room: Room): { source: Icon; tintColor: Color } {
  return {
    source: Icon.Circle,
    tintColor: room.participants.length > 0 ? Color.Green : Color.SecondaryText,
  };
}

function getAccessories(room: Room) {
  return [{ text: participantsLabel(room.participants.length) }];
}

function participantsLabel(count: number) {
  if (count === 1) {
    return `1 participant`;
  }

  return `${count} participants`;
}

function getActions(room: Room) {
  return (
    <ActionPanel>
      <Action
        title={`Join ${room.name}`}
        onAction={() => {
          join(room);
        }}
      />
      <Action
        title={`Copy Link`}
        onAction={() => {
          copyLink(room);
        }}
      />
    </ActionPanel>
  );
}

function join(room: Room) {
  closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  joinRoom(room.id);
}

function copyLink(room: Room) {
  closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  copyCallLink(room.id);
}
