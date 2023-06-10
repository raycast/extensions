import { ActionPanel, Action, List, Icon, showToast, Toast } from "@raycast/api";

import { RoomContext } from "../contexts/RoomsContext";
import { useContext } from "react";
import EditRoom from "../edit-room";
import AddRoom from "./AddRoomForm";
import { AppIcons, SupportedApps } from "../types";

export default function ListRooms() {
  const roomContext = useContext(RoomContext);

  if (!roomContext) {
    throw new Error("Command must be used within a RoomProvider");
  }

  const { rooms, removeRoom, loading } = roomContext;

  return (
    <List
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.Push title="Add Room" target={<AddRoom />} />
        </ActionPanel>
      }
    >
      {rooms.map((item) => (
        <List.Item
          key={item.url}
          icon={item.icon === AppIcons.Generic ? Icon.Person : { source: `icons/${item.icon}` }}
          title={item.name}
          subtitle={item.app !== SupportedApps.Generic ? undefined : item.url}
          accessories={[{ text: item.app }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={item.url} />
              <Action.CopyToClipboard content={item.url} />
              <Action.Push
                title="Edit Name"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                target={<EditRoom room={item} />}
              />
              <Action
                title="Remove"
                icon={Icon.Trash}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                onAction={() =>
                  removeRoom(item)?.then(() => {
                    // toast
                    showToast({
                      style: Toast.Style.Success,
                      title: "Yay!",
                      message: `${item.name} removed`,
                    });
                  })
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
