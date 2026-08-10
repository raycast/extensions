import { Icon, List } from "@raycast/api";
import { LinkStrength, NetworkDevice } from "../network-info";
import { NetworkInfo } from "../use-network-info";
import { linkStrengthColors } from "./ui";

interface ListItemProps {
  networkInfo: NetworkInfo;
}

export default function EthernetListItem({ networkInfo: { networkDevices } }: ListItemProps) {
  const loading = !networkDevices;

  const ethernetDevices = Object.values(networkDevices || {})
    .sort((a, b) => a.serviceOrder - b.serviceOrder)
    .filter((device) => device.type === "Ethernet" && device.ipAddress);
  const defaultDevice = ethernetDevices[0];

  const connected = ethernetDevices.length > 0;
  const connectionStatus = loading ? "Loading..." : connected ? "Connected" : "Disconnected";
  const icon = loading ? { source: Icon.Plug } : networkIcon(connected);

  return (
    <List.Item
      title="Ethernet"
      subtitle={connectionStatus}
      icon={icon}
      detail={
        <List.Item.Detail
          isLoading={loading}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title={connectionStatus} icon={icon} />
              {defaultDevice && <Metadata defaultDevice={defaultDevice} />}
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}

function Metadata({ defaultDevice }: { defaultDevice: NetworkDevice }) {
  return (
    <>
      <List.Item.Detail.Metadata.Separator />
      {defaultDevice.ipAddress && <List.Item.Detail.Metadata.Label title="IP Address" text={defaultDevice.ipAddress} />}
      <List.Item.Detail.Metadata.Label title="Interface" text={defaultDevice.interfaceName} />
    </>
  );
}

function networkIcon(connected: boolean) {
  if (!connected) {
    return { source: Icon.Plug };
  }

  const tintColor = linkStrengthColors[LinkStrength.Excellent];
  return { source: Icon.Plug, tintColor };
}
