import { List, Action, ActionPanel, Icon, Color, closeMainWindow, PopToRootType } from "@raycast/api";
import { Room, copyCallLink, getRooms, joinRoom } from "./lib/multi";
import { useEffect, useState } from "react";
import { showMultiScriptErrorToast } from "./lib/showMultiScriptErrorToast";

export default function Command() {
  const [rooms, isLoading] = useGetRooms();

  return (
    <List isLoading={isLoading}>
      {rooms.length === 0 ? (
        <List.EmptyView title={isLoading ? "Loading..." : "No rooms found"} />
      ) : (
        rooms.map((room) => (
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

function useGetRooms(): [Room[], boolean] {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  async function loadRooms() {
    setIsLoading(true);
    try {
      const response = await getRooms();
      setRooms(response.rooms);
    } catch (error) {
      console.error("Error getting rooms", error);
      showMultiScriptErrorToast(error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadRooms();
  }, []);

  return [rooms, isLoading];
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

async function join(room: Room) {
  // Unfortunatelly, we can't close the view before finishing the request because the request is aborted
  // It would be nice to have async actions that only unload the extension after the action is finished
  await joinRoom(room.id);

  closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
}

async function copyLink(room: Room) {
  // Unfortunatelly, we can't close the view before finishing the request because the request is aborted
  // It would be nice to have async actions that only unload the extension after the action is finished
  await copyCallLink(room.id);

  closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
}
