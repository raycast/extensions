import { Icon, List, getPreferenceValues, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { truncateDeviceID, timestampToReadableTime } from "./utils";

interface Device {
  deviceID: string;
  name: string;
  stats: DeviceStats;
}

interface DeviceStats {
  addresses: string[];
  introducer: boolean;
  introducedBy: string;
  paused: boolean;
  autoAcceptFolders: boolean;
  maxSendKbps: number;
  maxRecvKbps: number;
  lastSeen: string;
  lastConnectionDuration: number;
}

interface SyncthingDeviceStatsApi {
  lastSeen?: string;
  lastConnectionDurationS?: number;
}

interface SyncthingDeviceConfigApi {
  deviceID: string;
  name?: string;
  addresses?: string[];
  introducer?: boolean;
  introducedBy?: string;
  paused?: boolean;
  autoAcceptFolders?: boolean;
  maxSendKbps?: number;
  maxRecvKbps?: number;
}

async function getDevices(
  API_KEY: string,
  BASE_URL: string,
): Promise<Device[] | void> {
  // Call Syncthing API to get devices
  console.log("Fetching devices from " + BASE_URL + " with API key " + API_KEY);

  const headers = {
    "X-API-Key": API_KEY,
    Accept: "application/json",
  };

  try {
    // Fetch stats for time
    const statsRes = await fetch(BASE_URL + "/stats/device", { headers });
    const statsData = (await statsRes.json()) as Record<
      string,
      SyncthingDeviceStatsApi
    >;
    console.log("Stats data: ", statsData);

    // Fetch devices
    const devicesRes = await fetch(BASE_URL + "/config/devices", {
      headers,
    });
    const devicesData = (await devicesRes.json()) as SyncthingDeviceConfigApi[];
    console.log("Devices data: ", devicesData);

    // Combine device info with stats
    const devices: Device[] = devicesData.map((device) => {
      const deviceStats = statsData[device.deviceID] || {};
      return {
        deviceID: device.deviceID,
        name: device.name || "Unnamed Device",
        stats: {
          addresses: device.addresses || [],
          introducer: device.introducer || false,
          introducedBy: device.introducedBy || "N/A",
          paused: device.paused || false,
          autoAcceptFolders: device.autoAcceptFolders || false,
          maxSendKbps: device.maxSendKbps || 0,
          maxRecvKbps: device.maxRecvKbps || 0,
          lastSeen: deviceStats.lastSeen || "N/A",
          lastConnectionDuration: deviceStats.lastConnectionDurationS || 0,
        },
      };
    });
    showToast({
      title: "Devices fetched successfully",
      message: `Fetched ${devices.length} devices.`,
    });
    return devices;
  } catch (error) {
    console.error("Error fetching devices: ", error);
    showFailureToast("Failed to fetch devices.");
  }
}

function generateDetailMarkdown(device: Device): string {
  return `
# ${device.name || "Unnamed Device"}
**Device ID**: ${device.deviceID}

## Details
- Last Seen: ${timestampToReadableTime(device.stats.lastSeen)}
- Last Connection Duration: ${device.stats.lastConnectionDuration} seconds

## Stats
- **Addresses**: ${device.stats.addresses[0] || "N/A"}
- **Introducer**: ${device.stats.introducer ? "Yes" : "No"}
- **Paused**: ${device.stats.paused ? "Yes" : "No"}
- **Auto Accept Folders**: ${device.stats.autoAcceptFolders ? "Yes" : "No"}
- **Max Send Speed**: ${device.stats.maxSendKbps ? device.stats.maxSendKbps : "∞"} KB/s
- **Max Receive Speed**: ${device.stats.maxRecvKbps ? device.stats.maxRecvKbps : "∞"} KB/s
`;
}

export default function Command() {
  const [devices, setDevices] = useState<Device[]>([]);
  useEffect(() => {
    const API_KEY = getPreferenceValues().api_key;
    const BASE_URL = getPreferenceValues().base_url;
    getDevices(API_KEY, BASE_URL).then((fetchedDevices) => {
      if (fetchedDevices) {
        setDevices(fetchedDevices);
      } else {
        showFailureToast("Failed to fetch devices.");
      }
    });
  }, []);
  return (
    <List
      isLoading={devices.length === 0}
      searchBarPlaceholder="Search devices..."
      isShowingDetail
    >
      {devices.map((device) => (
        <List.Item
          key={device.deviceID}
          title={device.name || "Unnamed Device"}
          subtitle={truncateDeviceID(device.deviceID)}
          icon={Icon.HardDrive}
          detail={
            <List.Item.Detail markdown={generateDetailMarkdown(device)} />
          }
        />
      ))}
    </List>
  );
}
