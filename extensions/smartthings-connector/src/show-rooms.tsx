import {
  List,
  showToast,
  ToastStyle,
  ActionPanel,
  CopyToClipboardAction,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchRooms, fetchDevicesInRoom } from "./fetchRooms";

export default function ShowRooms() {
  const [rooms, setRooms] = useState([]);
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const roomsData = await fetchRooms();
        setRooms(roomsData);

        // Fetch devices for all rooms
        const devicePromises = roomsData.map((room: any) =>
          fetchDevicesInRoom(room.roomId),
        ); // Typ 'any' explizit angeben
        const devicesData = await Promise.all(devicePromises);
        setDevices(devicesData.flat() as any); // Typ 'any' explizit angeben
        setIsLoading(false);
      } catch (error) {
        showToast(
          ToastStyle.Failure,
          "Failed to fetch data",
          (error as Error).message,
        ); // Typ 'Error' explizit angeben
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search by room name..."
      onSearchTextChange={setSearchText}
      isShowingDetail
    >
      {rooms
        .filter((room: any) =>
          room.name.toLowerCase().includes(searchText.toLowerCase()),
        )
        .map(
          (
            room: any, // Typ 'any' explizit angeben
          ) => (
            <List.Item
              key={room.roomId} // Typ 'any' explizit angeben
              id={room.roomId} // Typ 'any' explizit angeben
              title={room.name} // Typ 'any' explizit angeben
              actions={
                <ActionPanel>
                  <CopyToClipboardAction
                    title="Copy Room Info"
                    content={JSON.stringify(room, null, 2)}
                  />
                </ActionPanel>
              }
              detail={
                <List.Item.Detail
                  markdown={
                    devices.length > 0
                      ? `### Devices in ${room.name}\n${devices
                          .filter(
                            (device: any) => device.roomId === room.roomId,
                          )
                          .map((device: any) => `- ${device.label}`)
                          .join("\n")}` // Typ 'any' explizit angeben
                      : "No devices found"
                  }
                />
              }
              accessoryTitle={`${devices.filter((device: any) => device.roomId === room.roomId).length} Devices`} // Typ 'any' explizit angeben
            />
          ),
        )}
    </List>
  );
}
