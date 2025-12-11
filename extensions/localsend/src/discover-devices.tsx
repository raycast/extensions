import { List, ActionPanel, Action, Icon, Color, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { discoverDevicesMulticast, getDeviceInfoHTTP } from "./utils/localsend";
import { LocalSendDevice } from "./types";

export default function Command() {
  const [devices, setDevices] = useState<LocalSendDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    discoverDevices();
  }, []);

  async function discoverDevices() {
    setIsLoading(true);
    try {
      const foundDevices = await discoverDevicesMulticast(5000);
      setDevices(foundDevices);

      if (foundDevices.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No devices found",
          message: "Make sure LocalSend is running on nearby devices",
        });
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: `Found ${foundDevices.length} device${foundDevices.length !== 1 ? "s" : ""}`,
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Discovery failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshDevice(device: LocalSendDevice) {
    try {
      const info = await getDeviceInfoHTTP(device.ip, device.port);
      if (info) {
        setDevices((prev) =>
          prev.map((d) => (d.ip === device.ip ? { ...info, ip: device.ip, lastSeen: Date.now() } : d)),
        );
        await showToast({
          style: Toast.Style.Success,
          title: "Device info updated",
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to refresh device",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  function getDeviceIcon(deviceType?: string): Icon {
    switch (deviceType) {
      case "mobile":
        return Icon.Mobile;
      case "desktop":
        return Icon.ComputerChip;
      case "server":
        return Icon.HardDrive;
      case "web":
        return Icon.Globe;
      default:
        return Icon.Laptop;
    }
  }

  function getProtocolTag(protocol: string) {
    return {
      value: protocol.toUpperCase(),
      color: protocol === "https" ? Color.Green : Color.Orange,
    };
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search devices...">
      <List.EmptyView
        icon={Icon.Network}
        title="No LocalSend Devices Found"
        description="Make sure LocalSend is running on nearby devices and try again"
        actions={
          <ActionPanel>
            <Action title="Discover Again" icon={Icon.MagnifyingGlass} onAction={discoverDevices} />
          </ActionPanel>
        }
      />
      {devices.map((device) => (
        <List.Item
          key={device.ip}
          icon={getDeviceIcon(device.deviceType)}
          title={device.alias}
          subtitle={device.deviceModel}
          accessories={[{ text: device.ip }, { tag: getProtocolTag(device.protocol) }, { text: `v${device.version}` }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy IP Address" content={device.ip} />
              <Action title="Refresh Device Info" icon={Icon.ArrowClockwise} onAction={() => refreshDevice(device)} />
              <Action title="Discover Again" icon={Icon.MagnifyingGlass} onAction={discoverDevices} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
