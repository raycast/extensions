import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { PingResult } from "../network-info/ping";
import { PublicIpResult } from "../network-info/public-ip";
import { NetworkInfo } from "../use-network-info";

interface ListItemProps {
  networkInfo: NetworkInfo;
}

export default function InternetListItem({ networkInfo: { publicIp, googlePing } }: ListItemProps) {
  const loading = !publicIp;
  const connected = publicIp?.success ?? false;
  const connectionStatus = loading ? "Loading..." : connected ? "Connected" : "Disconnected";
  const icon = loading ? { source: Icon.Globe } : networkIcon(connected);

  return (
    <List.Item
      title="Internet"
      subtitle={connectionStatus}
      icon={icon}
      detail={
        <List.Item.Detail
          isLoading={loading}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title={connectionStatus} icon={icon} />
              {publicIp?.success && <InternetMetadata publicIp={publicIp} googlePing={googlePing} />}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {publicIp?.success && (
              <Action.CopyToClipboard title="Copy Public IP Address" content={publicIp.info.ipv4} />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function InternetMetadata({ publicIp, googlePing }: { publicIp: PublicIpResult; googlePing?: PingResult }) {
  let ping = "Unavailable";
  if (googlePing) {
    ping = googlePing.success ? `${googlePing.time} ms` : "Unable to ping 8.8.8.8";
  }
  return (
    <>
      <List.Item.Detail.Metadata.Label title="Latency to Google" text={ping} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Public IP Address" text={publicIp.info?.ipv4 ?? "Unavailable"} />
      {publicIp.info?.country && <List.Item.Detail.Metadata.Label title="Country" text={publicIp.info.country} />}
      {publicIp.info?.region && <List.Item.Detail.Metadata.Label title="Region" text={publicIp.info.region} />}
      {publicIp.info?.org && <List.Item.Detail.Metadata.Label title="ISP" text={publicIp.info.org} />}
    </>
  );
}

function networkIcon(connected: boolean) {
  if (!connected) {
    return { source: Icon.Globe, tintColor: Color.Red };
  }
  return { source: Icon.Globe, tintColor: Color.Green };
}
