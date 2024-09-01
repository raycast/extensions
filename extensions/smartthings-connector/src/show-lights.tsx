import { List, showToast, ToastStyle, ActionPanel, CopyToClipboardAction, Icon, Color } from '@raycast/api';
import { useEffect, useState, useCallback } from 'react';
import { fetchDevices } from './fetchDevices';
import { fetchRooms } from './fetchRooms';
import { toggleLight } from './toggleLight';

export default function Command() {
  const [devices, setDevices] = useState<any[]>([]); // Typ explizit auf any[] gesetzt
  const [filteredDevices, setFilteredDevices] = useState<any[]>([]); // Typ explizit auf any[] gesetzt
  const [rooms, setRooms] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [roomsData, devicesData] = await Promise.all([fetchRooms(), fetchDevices()]);

      const roomsMap = roomsData.reduce((acc: any, room: any) => {
        acc[room.roomId] = room.name;
        return acc;
      }, {});
      setRooms(roomsMap);

      const lightDevices = devicesData
        .filter((device: any) =>
          device.components.some((component: any) =>
            component.categories.some((category: any) => category.name === 'Light')
          )
        )
        .sort((a: any, b: any) => {
          const aTimestamp = a.status?.switch?.switch?.timestamp || 0;
          const bTimestamp = b.status?.switch?.switch?.timestamp || 0;
          return new Date(bTimestamp).getTime() - new Date(aTimestamp).getTime();
        });

      setDevices(lightDevices);
      setFilteredDevices(lightDevices);
    } catch (error) {
      showToast(ToastStyle.Failure, "Failed to fetch data", (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (searchText === '') {
      setFilteredDevices(devices);
    } else {
      const filtered = devices.filter((device: any) =>
        device.label.toLowerCase().includes(searchText.toLowerCase()) ||
        (rooms[device.roomId] && rooms[device.roomId].toLowerCase().includes(searchText.toLowerCase()))
      );
      setFilteredDevices(filtered);
    }
  }, [searchText, devices, rooms]);

  const getStatusIcon = useCallback((device: any) => {
    if (device.status?.switch?.switch?.value === 'on') {
      return { source: Icon.LightBulb, tintColor: Color.Green };
    }
    return Icon.LightBulb;
  }, []);

  const handleToggleLight = useCallback(async (device: any) => {
    if (device.status?.switch) {
      const currentStatus = device.status.switch.switch.value;
      try {
        const newStatus = await toggleLight(device.deviceId, currentStatus);
        setDevices((prevDevices: any[]) =>
          prevDevices.map((d: any) =>
            d.deviceId === device.deviceId
              ? { ...d, status: { ...d.status, switch: { ...d.status.switch, switch: { ...d.status.switch.switch, value: newStatus } } } }
              : d
          )
        );
      } catch (error) {
        showToast(ToastStyle.Failure, "Failed to toggle light", (error as Error).message);
      }
    }
  }, []);

  const getDetailMarkdown = useCallback((device: any) => {
    const switchStatus = device.status?.switch?.switch?.value || 'unknown';
    const timestamp = device.status?.switch?.switch?.timestamp || 'N/A';
    const level = device.status?.switchLevel?.level?.value || 'N/A';
    const levelPercentage = level !== 'N/A' ? `${level}%` : level;

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
      {filteredDevices.map((device: any) => (
        <List.Item
          key={device.deviceId}
          title={device.label}
          subtitle={rooms[device.roomId] || 'Unknown Room'}
          actions={
            <ActionPanel>
              <ActionPanel.Item
                title="Toggle Light"
                icon={Icon.Power}
                onAction={() => handleToggleLight(device)}
              />
              <CopyToClipboardAction title="Copy Device Info" content={JSON.stringify(device, null, 2)} />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail markdown={getDetailMarkdown(device)} />
          }
          accessoryIcon={getStatusIcon(device)}
        />
      ))}
    </List>
  );
}
