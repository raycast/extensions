import {
  List,
  showToast,
  ToastStyle,
  ActionPanel,
  CopyToClipboardAction,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchRooms, fetchDevicesInRoom } from "./fetchRooms";

// Am Anfang der Datei fügen Sie diese Interfaces hinzu:
interface Room {
  roomId: string;
  name: string;
  // Fügen Sie hier weitere Eigenschaften hinzu, die ein Room haben könnte
}

interface Device {
  deviceId: string;
  label: string;
  roomId: string;
  // Fügen Sie hier weitere Eigenschaften hinzu, die ein Device haben könnte
}

export default function ShowRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const roomsData = await fetchRooms();
        setRooms(roomsData);

        // Fetch devices for all rooms
        const devicePromises = roomsData.map((room: Room) =>
          fetchDevicesInRoom(room.roomId),
        );
        const devicesData = await Promise.all(devicePromises);
        setDevices(devicesData.flat() as Device[]);
        setIsLoading(false);
      } catch (error) {
        showToast(
          ToastStyle.Failure,
          "Failed to fetch data",
          (error as Error).message,
        );
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
        .filter((room: Room) =>
          room.name.toLowerCase().includes(searchText.toLowerCase()),
        )
        .map((room: Room) => (
          <List.Item
            key={room.roomId}
            id={room.roomId}
            title={room.name}
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
                          (device: Device) => device.roomId === room.roomId,
                        )
                        .map((device: Device) => `- ${device.label}`)
                        .join("\n")}`
                    : "No devices found"
                }
              />
            }
            accessoryTitle={`${devices.filter((device: Device) => device.roomId === room.roomId).length} Devices`}
          />
        ))}
    </List>
  );
}
