import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useMemo } from "react";
import { LatencyResult, LinkStrength, NetworkDevice, NetworkDevices, Route } from "../network-info";
import { PingResult } from "../network-info/ping";
import { physicalRoutes } from "../network-info/routes";
import { NetworkInfo } from "../use-network-info";
import { linkStrengthColors } from "./ui";

export interface LocalNetworkInfo {
  connected: boolean;
  loading: boolean;
  defaultRoute?: Route;
  defaultPhysicalDevice?: NetworkDevice;
  defaultInterface?: string;
}

function localNetworkInfo(devices?: NetworkDevices, routes?: Route[]): LocalNetworkInfo {
  const networkInfo: LocalNetworkInfo = { loading: false, connected: false };

  if (!devices || !routes) {
    networkInfo.loading = true;
    return networkInfo;
  }

  if (routes.length === 0) {
    return networkInfo;
  }
  networkInfo.defaultInterface = routes[0].interfaceName;

  // We might have multiple default routes, for instance if a VPN is connected. Here, we only care
  // about default routes backed by a hardware network device.
  const physRoutes = physicalRoutes(devices, routes);
  if (physRoutes.length === 0) {
    return networkInfo;
  }

  networkInfo.defaultRoute = physRoutes[0];
  networkInfo.connected = true;

  networkInfo.defaultPhysicalDevice = devices[networkInfo.defaultRoute.interfaceName];

  return networkInfo;
}

interface ListItemProps {
  networkInfo: NetworkInfo;
}

export default function LocalNetworkListItem({ networkInfo }: ListItemProps) {
  // networkDevices and defaultRoutes are recreated each refresh so useMemo isn't doing all
  // that much here, but it at least stops other changes to networkInfo causing recalculations.
  const { networkDevices, defaultRoutes, gatewayPing, nameservers } = networkInfo;
  const localNetInfo = useMemo(() => localNetworkInfo(networkDevices, defaultRoutes), [networkDevices, defaultRoutes]);

  const { loading, connected, defaultPhysicalDevice } = localNetInfo;

  const connectionStatus = loading ? "Loading..." : connected ? "Connected" : "Disconnected";
  let connectionName = defaultPhysicalDevice?.type;
  if (connectionName !== defaultPhysicalDevice?.name) {
    connectionName += ` (${defaultPhysicalDevice?.name})`;
  }
  const icon = loading ? { source: Icon.Network } : networkIcon(localNetInfo);

  return (
    <List.Item
      title="Local Network"
      subtitle={connectionStatus}
      icon={icon}
      detail={
        <List.Item.Detail
          isLoading={loading}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title={connected ? `${connectionStatus} via ${connectionName}` : `${connectionStatus}`}
                icon={icon}
              />
              {localNetInfo && connected && (
                <Metadata networkInfo={localNetInfo} nextHopLatencyResult={gatewayPing} nameservers={nameservers} />
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {localNetInfo.defaultRoute && (
              <>
                <Action.CopyToClipboard
                  title="Copy Local IP Address"
                  content={localNetInfo.defaultRoute?.interfaceAddr}
                />
                <Action.CopyToClipboard title="Copy Router IP Address" content={localNetInfo.defaultRoute?.gateway} />
                <Action.OpenInBrowser
                  title="Open Router Interface"
                  url={`http://${localNetInfo?.defaultRoute?.gateway}`}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
              </>
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

interface MetadataProps {
  networkInfo: LocalNetworkInfo;
  nextHopLatencyResult?: LatencyResult;
  nameservers?: string[];
}
export function Metadata({ networkInfo, nextHopLatencyResult, nameservers }: MetadataProps) {
  const { defaultRoute, defaultInterface } = networkInfo;
  let nextHopLatency = "Unavailable";
  if (nextHopLatencyResult) {
    nextHopLatency = nextHopLatencyResult.success ? `${nextHopLatencyResult.time} ms` : "Unavailable";
  }

  const usingTunnel = defaultRoute?.interfaceName !== defaultInterface;

  return (
    <>
      <List.Item.Detail.Metadata.Label title="Latency to Gateway" text={nextHopLatency} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="IP Address" text={defaultRoute?.interfaceAddr ?? "Unavailable"} />
      <List.Item.Detail.Metadata.Label title="Router" text={defaultRoute?.gateway ?? "Unavailable"} />
      {usingTunnel ? (
        <>
          <List.Item.Detail.Metadata.Label title="Default Interface" text={defaultInterface ?? "Unavailable"} />
          <List.Item.Detail.Metadata.Label
            title="Physical Interface"
            text={defaultRoute?.interfaceName ?? "Unavailable"}
          />
        </>
      ) : (
        <List.Item.Detail.Metadata.Label title="Interface" text={defaultRoute?.interfaceName ?? "Unavailable"} />
      )}
      <List.Item.Detail.Metadata.Label title="DNS Server" text={nameservers?.[0] ?? "Unavailable"} />
    </>
  );
}

function networkIcon(networkInfo: LocalNetworkInfo) {
  if (!networkInfo.connected) {
    return { source: Icon.Network, tintColor: Color.Red };
  }

  const tintColor = linkStrengthColors[LinkStrength.Excellent];
  return { source: Icon.Network, tintColor };
}
