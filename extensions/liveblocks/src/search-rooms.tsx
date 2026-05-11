import { ActionPanel, Action, Icon, List, useNavigation, confirmAlert, openExtensionPreferences } from "@raycast/api";
import { RoomData } from "@liveblocks/node";
import { useEffect, useState } from "react";

import { deleteRoomStorage, getRooms } from "./api";
import ActiveUsers from "./views/active-users";
import GetRoomStorage from "./views/get-room-storage";
import InitRoomStorage from "./views/init-room-storage";
import UpdateRoomId from "./views/update-room-id";
import BroadcastEvent from "./views/broadcast-event";
import GetYjsDocument from "./views/get-yjs-document";
import GetYjsBinaryUpdate from "./views/get-yjs-binary-update";
import SendYjsBinaryUpdate from "./views/send-yjs-binary-update";

export default function Command() {
  const { push } = useNavigation();
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchRooms = async () => {
    try {
      const rooms = await getRooms(nextCursor);

      setNextCursor(rooms.nextCursor);
      setRooms((prevRooms) => [...prevRooms, ...rooms.data]);
      setLoading(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "An error occurred";

      setErrorMessage(message);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  if (errorMessage) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Whoops!"
          description={errorMessage}
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                onAction={openExtensionPreferences}
                icon={Icon.Gear}
                shortcut={{ modifiers: ["cmd"], key: "," }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={loading}
      pagination={{
        pageSize: 40,
        hasMore: !!nextCursor,
        onLoadMore: () => fetchRooms(),
      }}
    >
      {rooms.map((room, index) => (
        <List.Item
          key={index}
          title={room.id}
          actions={
            <ActionPanel>
              <Action
                title="Get Active Users"
                icon={Icon.TwoPeople}
                onAction={() => push(<ActiveUsers roomId={room.id} />)}
                shortcut={{ modifiers: ["cmd"], key: "g" }}
              />
              <Action
                title="Get Room Storage"
                icon={Icon.List}
                onAction={() => push(<GetRoomStorage roomId={room.id} />)}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action
                title="Initialize Room Storage"
                icon={Icon.Plus}
                onAction={() => push(<InitRoomStorage roomId={room.id} />)}
                shortcut={{ modifiers: ["cmd"], key: "i" }}
              />
              <Action
                title="Update Room ID"
                icon={Icon.Pencil}
                onAction={() => push(<UpdateRoomId roomId={room.id} />)}
                shortcut={{ modifiers: ["cmd"], key: "u" }}
              />
              <Action
                title="Broadcast Event"
                icon={Icon.Airplane}
                onAction={() => push(<BroadcastEvent roomId={room.id} />)}
                shortcut={{ modifiers: ["cmd"], key: "b" }}
              />
              <Action
                title="Get Yjs Document"
                icon={Icon.List}
                onAction={() => push(<GetYjsDocument roomId={room.id} />)}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
              <Action
                title="Get Yjs Binary Update"
                icon={Icon.List}
                onAction={() => push(<GetYjsBinaryUpdate roomId={room.id} />)}
                shortcut={{ modifiers: ["cmd"], key: "y" }}
              />
              <Action
                title="Send Yjs Binary Update"
                icon={Icon.Airplane}
                onAction={() => push(<SendYjsBinaryUpdate roomId={room.id} />)}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
              />
              <Action
                title="Delete Room Storage"
                icon={Icon.Trash}
                onAction={async () => {
                  if (await confirmAlert({ title: "Are you sure?" })) {
                    await deleteRoomStorage(room.id);

                    fetchRooms();
                  }
                }}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
