import {
  List,
  showToast,
  ToastStyle,
  ActionPanel,
  CopyToClipboardAction,
  Icon,
  Color,
} from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { fetchDevices } from "./fetchDevices";
import { fetchRooms } from "./fetchRooms";
import { toggleLight } from "./toggleLight";

interface DeviceStatus {
  switch: {
    switch?: {
      timestamp?: string;
      value?: string;
    };
  };
  switchLevel?: {
    level?: {
      value?: number;
    };
  };
}

interface ApiDevice {
  deviceId: string;
  label: string | undefined;
  roomId: string;
  components: Array<{ categories: Array<{ name: string }> }>;
  status?: DeviceStatus;
  deviceTypeName: string;
  id: string;
  name: string;
}

interface Device {
  deviceId: string;
  label: string;
  roomId: string;
  components: Array<{ categories: Array<{ name: string }> }>;
  status?: DeviceStatus;
  deviceTypeName: string;
  id: string;
  name: string;
}

interface Room {
  roomId: string;
  name: string;
}

export default function Command() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
  const [rooms, setRooms] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [roomsData, devicesData] = await Promise.all([
        fetchRooms(),
        fetchDevices(),
      ]);

      const roomsMap = roomsData.reduce(
        (acc: { [key: string]: string }, room: Room) => {
          acc[room.roomId] = room.name;
          return acc;
        },
        {},
      );
      setRooms(roomsMap);

      const lightDevices: Device[] = (devicesData as unknown as ApiDevice[])
        .filter((device): device is Device => {
          return !!(
            typeof device.deviceId === "string" &&
            typeof device.label === "string" &&
            device.roomId &&
            device.components &&
            Array.isArray(device.components) &&
            device.components.some(
              (component) =>
                component.categories &&
                Array.isArray(component.categories) &&
                component.categories.some(
                  (category) => category.name === "Light",
                ),
            )
          );
        })
        .map((device) => ({
          ...device,
          label: device.label as string,
        }));

      setDevices(lightDevices);
      setFilteredDevices(lightDevices);
    } catch (error) {
      showToast({
        style: ToastStyle.Failure, // ToastStyle statt Toast.Style
        title: "Failed to fetch data",
        message: (error as Error).message,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (searchText === "") {
      setFilteredDevices(devices);
    } else {
      const filtered = devices.filter(
        (device: Device) =>
          device.label.toLowerCase().includes(searchText.toLowerCase()) ||
          (rooms[device.roomId] &&
            rooms[device.roomId]
              .toLowerCase()
              .includes(searchText.toLowerCase())),
      );
      setFilteredDevices(filtered);
    }
  }, [searchText, devices, rooms]);

  const getStatusIcon = useCallback((device: Device) => {
    if (device.status?.switch?.switch?.value === "on") {
      return { source: Icon.LightBulb, tintColor: Color.Green };
    }
    return Icon.LightBulb;
  }, []);

  const handleToggleLight = useCallback(async (device: Device) => {
    if (device.status?.switch?.switch?.value) {
      const currentStatus = device.status.switch.switch.value;
      try {
        const newStatus = await toggleLight(device.deviceId, currentStatus);
        setDevices((prevDevices) =>
          prevDevices.map((d) =>
            d.deviceId === device.deviceId
              ? {
                  ...d,
                  status: {
                    ...d.status,
                    switch: {
                      ...d.status?.switch,
                      switch: { ...d.status?.switch?.switch, value: newStatus },
                    },
                  },
                }
              : d,
          ),
        );
      } catch (error) {
        showToast(
          ToastStyle.Failure,
          "Fehler beim Umschalten des Lichts",
          (error as Error).message,
        );
      }
    }
  }, []);

  const getDetailMarkdown = useCallback((device: Device) => {
    const switchStatus = device.status?.switch?.switch?.value || "unknown";
    const timestamp = device.status?.switch?.switch?.timestamp || "N/A";
    const level = device.status?.switchLevel?.level?.value || "N/A";
    const levelPercentage = level !== "N/A" ? `${level}%` : level;

    return `## Device Status\n
---
**Switch State:** ${switchStatus}\n
**Light Level:** ${levelPercentage}\n
**Last Updated:** ${timestamp}`;
  }, []);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search by device name or room"
      onSearchTextChange={setSearchText}
      isShowingDetail
    >
      {filteredDevices.map((device: Device) => (
        <List.Item
          key={device.deviceId}
          title={device.label}
          subtitle={rooms[device.roomId] || "Unknown Room"}
          actions={
            <ActionPanel>
              <ActionPanel.Item
                title="Toggle Light"
                icon={Icon.Power}
                onAction={() => handleToggleLight(device)}
              />
              <CopyToClipboardAction
                title="Copy Device Info"
                content={JSON.stringify(device, null, 2)}
              />
            </ActionPanel>
          }
          detail={<List.Item.Detail markdown={getDetailMarkdown(device)} />}
          accessoryIcon={getStatusIcon(device)}
        />
      ))}
    </List>
  );
}
