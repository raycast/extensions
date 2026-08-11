import { List, ActionPanel, Action, Icon, Color, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { discoverDevicesMulticast, getDeviceInfoHTTP, getLocalIPs } from "./utils/localsend";
import { getFavoriteDevices, toggleFavoriteDevice, isFavoriteDevice } from "./utils/favorites";
import { LocalSendDevice } from "./types";

export default function Command() {
  const [devices, setDevices] = useState<LocalSendDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const discoverDevices = async () => {
    setIsLoading(true);
    try {
      const foundDevices = await discoverDevicesMulticast(5000);

      const favorites = await getFavoriteDevices();
      const localIPs = getLocalIPs();

      const devicesWithFavorites = foundDevices
        .filter((device) => !localIPs.includes(device.ip))
        .map((device) => ({
          ...device,
          isFavorite: favorites.some((f) => f.fingerprint === device.fingerprint),
        }));

      setDevices(devicesWithFavorites);

      if (devicesWithFavorites.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No devices found",
          message: "Make sure LocalSend is running on nearby devices",
        });
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: `Found ${devicesWithFavorites.length} device${devicesWithFavorites.length !== 1 ? "s" : ""}`,
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
  };

  const refreshDevice = async (device: LocalSendDevice) => {
    try {
      const info = await getDeviceInfoHTTP(device.ip, device.port);
      if (info) {
        const isFav = await isFavoriteDevice(device.fingerprint);
        setDevices((prev) =>
          prev.map((d) =>
            d.ip === device.ip ? { ...info, ip: device.ip, lastSeen: Date.now(), isFavorite: isFav } : d,
          ),
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
  };

  const handleToggleFavorite = async (device: LocalSendDevice) => {
    const isFav = await toggleFavoriteDevice(device);
    setDevices((prev) => prev.map((d) => (d.fingerprint === device.fingerprint ? { ...d, isFavorite: isFav } : d)));
    await showToast({
      style: Toast.Style.Success,
      title: isFav ? "Added to favorites" : "Removed from favorites",
    });
  };

  const getDeviceIcon = (deviceType?: string): Icon => {
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
        return Icon.ComputerChip;
    }
  };

  const getProtocolTag = (protocol: string) => ({
    value: protocol.toUpperCase(),
    color: protocol === "https" ? Color.Green : Color.Orange,
  });

  useEffect(() => {
    discoverDevices();
  }, []);

  const favoriteDevices = devices.filter((d) => d.isFavorite);
  const otherDevices = devices.filter((d) => !d.isFavorite);

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

      {favoriteDevices.length > 0 && (
        <List.Section title="Favorites">
          {favoriteDevices.map((device) => (
            <DeviceListItem
              key={device.ip}
              device={device}
              getDeviceIcon={getDeviceIcon}
              getProtocolTag={getProtocolTag}
              onRefresh={refreshDevice}
              onToggleFavorite={handleToggleFavorite}
              onDiscoverAgain={discoverDevices}
            />
          ))}
        </List.Section>
      )}

      {otherDevices.length > 0 && (
        <List.Section title={favoriteDevices.length > 0 ? "Other Devices" : "Devices"}>
          {otherDevices.map((device) => (
            <DeviceListItem
              key={device.ip}
              device={device}
              getDeviceIcon={getDeviceIcon}
              getProtocolTag={getProtocolTag}
              onRefresh={refreshDevice}
              onToggleFavorite={handleToggleFavorite}
              onDiscoverAgain={discoverDevices}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

const DeviceListItem = ({
  device,
  getDeviceIcon,
  getProtocolTag,
  onRefresh,
  onToggleFavorite,
  onDiscoverAgain,
}: {
  device: LocalSendDevice;
  getDeviceIcon: (deviceType?: string) => Icon;
  getProtocolTag: (protocol: string) => { value: string; color: Color };
  onRefresh: (device: LocalSendDevice) => void;
  onToggleFavorite: (device: LocalSendDevice) => void;
  onDiscoverAgain: () => void;
}) => {
  return (
    <List.Item
      icon={getDeviceIcon(device.deviceType)}
      title={device.alias}
      subtitle={device.deviceModel}
      accessories={[
        ...(device.isFavorite ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow } }] : []),
        { text: device.ip },
        { tag: getProtocolTag(device.protocol) },
        { text: `v${device.version}` },
      ]}
      actions={
        <ActionPanel>
          <Action
            title={device.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            icon={device.isFavorite ? Icon.StarDisabled : Icon.Star}
            onAction={() => onToggleFavorite(device)}
          />
          <Action.CopyToClipboard title="Copy IP Address" content={device.ip} />
          <Action title="Refresh Device Info" icon={Icon.ArrowClockwise} onAction={() => onRefresh(device)} />
          <Action title="Discover Again" icon={Icon.MagnifyingGlass} onAction={onDiscoverAgain} />
        </ActionPanel>
      }
    />
  );
};
