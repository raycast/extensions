import { Color, Icon, List } from "@raycast/api";
import { LinkStrength, NetworkDevice, WiFiInfo } from "../network-info";
import { NetworkInfo } from "../use-network-info";
import { linkStrengthColors, linkStrengthIcons } from "./ui";

interface ListItemProps {
  networkInfo: NetworkInfo;
}

export default function WiFiListItem({ networkInfo: { wifiInfo, networkDevices } }: ListItemProps) {
  const loading = !wifiInfo;
  const connected = !!wifiInfo?.ssid;
  const connectionStatus = loading ? "Loading..." : connected ? "Connected" : "Disconnected";
  const icon = loading ? { source: Icon.Wifi } : networkIcon(connected, wifiInfo?.linkStrength);

  const wifiDevice = Object.values(networkDevices ?? {}).find((device) => device.type === "Wi-Fi");

  return (
    <List.Item
      title="Wi-Fi"
      subtitle={connectionStatus}
      icon={icon}
      detail={
        <List.Item.Detail
          isLoading={loading}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title={connectionStatus} icon={icon} />
              {wifiInfo && wifiDevice && <WifiMetadata wifiInfo={wifiInfo} wifiDevice={wifiDevice} />}
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}

function WifiMetadata({ wifiInfo, wifiDevice }: { wifiInfo: WiFiInfo; wifiDevice: NetworkDevice }) {
  return (
    <>
      {wifiInfo.linkStrength && (
        <List.Item.Detail.Metadata.Label
          title="Signal Strength"
          text={`${wifiInfo.linkStrength} (${wifiInfo.rssi} dBm)`}
          icon={{
            source: linkStrengthIcons[wifiInfo.linkStrength ?? LinkStrength.Excellent],
            tintColor: linkStrengthColors[wifiInfo.linkStrength ?? LinkStrength.Excellent],
          }}
        />
      )}
      <List.Item.Detail.Metadata.Separator />
      {wifiDevice.ipAddress && <List.Item.Detail.Metadata.Label title="IP Address" text={wifiDevice.ipAddress} />}
      {wifiInfo.ssid && <List.Item.Detail.Metadata.Label title="Network" text={wifiInfo.ssid} />}
      <List.Item.Detail.Metadata.Label title="Interface" text={wifiDevice.interfaceName} />
    </>
  );
}

function networkIcon(connected: boolean, linkStrength?: LinkStrength) {
  if (!connected) {
    return { source: Icon.Wifi };
  }

  const tintColor = linkStrengthColors[linkStrength ?? LinkStrength.Excellent];
  return { source: Icon.Wifi, tintColor };
}
