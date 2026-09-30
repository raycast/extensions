import { ActionPanel, Action, Icon, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  fetchConnectedDevices,
  refreshDevices,
  startBackgroundRefresh,
  getRandomName,
  estimateNetworkPerformance,
  getPerformanceColor,
} from "./service";
import { getAvatarIcon } from "@raycast/utils";
import { Device } from "../types";

export default function Command() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSavedNames = async (currentDevices: Device[]) => {
    try {
      const savedData = await LocalStorage.getItem<string>("devices");
      if (savedData) {
        const savedDevices: Device[] = JSON.parse(savedData);
        return currentDevices.map((device) => {
          const savedDevice = savedDevices.find((d) => d.mac === device.mac);
          const deviceName = savedDevice?.name || getRandomName();
          return {
            ...device,
            name: deviceName,
            avatar: getAvatarIcon(deviceName, { gradient: true }),
            performance: savedDevice?.performance,
          };
        });
      }
      return currentDevices.map((device) => ({
        ...device,
        name: getRandomName(),
        avatar: getAvatarIcon(device.name || getRandomName(), { gradient: true }),
      }));
    } catch (error) {
      console.error("Failed to load saved device names:", error);
      return currentDevices;
    }
  };

  const handleRandomizeAll = async () => {
    try {
      const updatedDevices = devices.map((device) => ({
        ...device,
        name: getRandomName(),
        avatar: getAvatarIcon(device.name || getRandomName(), { gradient: true }),
      }));
      setDevices(updatedDevices);
      await LocalStorage.setItem("devices", JSON.stringify(updatedDevices));
      showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: "All devices have new identities!",
      });
    } catch (error) {
      console.error("Failed to randomize all names:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to generate new names",
      });
    }
  };

  const handleNetworkPerformance = async (device: Device) => {
    try {
      const performance = await estimateNetworkPerformance(device.ip);
      const updatedDevices = devices.map((d) =>
        d.mac === device.mac
          ? {
              ...d,
              performance,
            }
          : d
      );
      setDevices(updatedDevices);
      await LocalStorage.setItem("devices", JSON.stringify(updatedDevices));
      showToast({
        style: Toast.Style.Success,
        title: "Network Performance",
        message: `Estimated performance: ${performance}`,
      });
    } catch (error) {
      console.error("Failed to estimate network performance:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to estimate network performance",
      });
    }
  };

  const handleInitialLoad = async () => {
    try {
      const fetchedDevices = await fetchConnectedDevices();
      const devicesWithNames = await loadSavedNames(fetchedDevices);
      setDevices(devicesWithNames);
    } catch (error) {
      console.error("Failed to load devices:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to load devices",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const refreshedDevices = await refreshDevices();
      const devicesWithNames = await loadSavedNames(refreshedDevices);
      setDevices(devicesWithNames);
      showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: `Found ${devicesWithNames.length} devices`,
      });
    } catch (error) {
      console.error("Failed to refresh devices:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to refresh devices",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleInitialLoad();
    const cleanup = startBackgroundRefresh();
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search devices..."
      actions={
        !isLoading && devices.length > 0 ? (
          <ActionPanel>
            <Action
              title="Randomize All Names"
              icon={Icon.Wand}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={handleRandomizeAll}
            />
            <Action
              title="Refresh Devices"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={handleRefresh}
            />
          </ActionPanel>
        ) : null
      }
    >
      {isLoading ? (
        <List.EmptyView
          icon={Icon.CircleProgress}
          title="Loading devices..."
          description="Please wait while we fetch the connected devices."
        />
      ) : (
        devices.map((device, index) => (
          <List.Item
            key={`${device.mac}-${index}`}
            icon={device.avatar || Icon.Network}
            title={device.name || `Mystery Device (${device.ip})`}
            subtitle={device.mac}
            accessories={[
              { text: device.ip },
              {
                text: device.performance ? `${device.performance}` : "",
                tooltip: device.performance ? "Network Performance" : "double click to estimate",
                icon: device.performance
                  ? { source: Icon.Gear, tintColor: getPerformanceColor(device.performance) }
                  : Icon.Gauge,
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Estimate Network Performance"
                    icon={Icon.Gauge}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={() => handleNetworkPerformance(device)}
                  />
                  <Action
                    title="Refresh Devices"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={handleRefresh}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard title="Copy Ip" content={device.ip} />
                  <Action.CopyToClipboard title="Copy Mac" content={device.mac} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
