import { ActionPanel, Action, List, Icon, showToast, Toast, confirmAlert } from "@raycast/api";

import { RoomContext } from "../contexts/RoomsContext";
import { useContext, useEffect, useState } from "react";
import EditRoom from "../edit-room";
import AddRoom from "./AddRoomForm";
import { AppIcons, SupportedApps } from "../types";

export default function ListRooms(props: { name?: string }) {
  const { name } = props;
  const roomContext = useContext(RoomContext);
  const [searchText, setSearchText] = useState(name);

  if (!roomContext) {
    throw new Error("ListRooms must be used within a RoomProvider");
  }

  const { rooms, removeRoom, loading, refreshRooms } = roomContext;

  // hack to refresh rooms manually when a room is edited
  const [refreshKey, setRefreshKey] = useState(0);

  // we should not need this if we can hook on navigation changes
  useEffect(() => {
    refreshRooms();
  }, [refreshKey]);

  return (
    <List
      isLoading={loading}
      searchText={searchText}
      filtering={true}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search rooms"
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
                target={<EditRoom room={item} setRefreshKey={setRefreshKey} />}
              />
              <Action
                title="Remove"
                icon={Icon.Trash}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                onAction={async () => {
                  if (await confirmAlert({ title: "Are you sure?" })) {
                    removeRoom(item)?.then(() => {
                      showToast({
                        style: Toast.Style.Success,
                        title: "Yay!",
                        message: `${item.name} removed`,
                      });
                    });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
