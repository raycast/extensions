import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Icon,
  List,
  showToast,
  Toast,
  type LaunchProps,
} from "@raycast/api";
import { useCallback, useMemo, useState } from "react";
import { getSelectedSite } from "./api/preferences";
import type { NetworkDevice, NetworkDeviceDetails, NetworkDeviceStatistics, NetworkPort, Site } from "./api/types";
import { MissingSite, ResourceError } from "./components/states";
import { useAsyncResource } from "./hooks/use-async-resource";
import { useUniFiClient } from "./hooks/use-unifi";
import { formatBitsPerSecond, formatDate, formatDurationSeconds, formatMegabitsPerSecond } from "./lib/format";

function deviceIcon(device: NetworkDevice) {
  if (device.features.includes("gateway")) return "console-icon.svg";
  if (device.features.includes("switching")) return "switch.svg";
  if (device.features.includes("accessPoint")) return "ap-icon.svg";
  return "unifi.png";
}

function stateIcon(state: string) {
  return {
    source: state === "ONLINE" ? Icon.CircleProgress100 : Icon.Circle,
    tintColor: state === "ONLINE" ? Color.Green : state === "OFFLINE" ? Color.Red : Color.Orange,
  };
}

function deviceMarkdown(device: NetworkDeviceDetails, stats?: NetworkDeviceStatistics): string {
  const ports = device.interfaces.ports ?? [];
  const radios = device.interfaces.radios ?? [];
  const sections: string[] = [];

  if (ports.length > 0) {
    sections.push(
      `## Ports\n\n| Port | Connector | Link | Speed | Maximum |\n| ---: | --- | --- | ---: | ---: |\n${ports
        .map(
          (port) =>
            `| ${port.idx} | ${port.connector.replace("SFPPLUS", "SFP+")} | ${port.state} | ${formatMegabitsPerSecond(port.speedMbps)} | ${formatMegabitsPerSecond(port.maxSpeedMbps)} |`,
        )
        .join("\n")}`,
    );
  }

  if (radios.length > 0) {
    sections.push(
      `## Radios\n\n| Band | Channel | Width | Standard | Retries |\n| --- | ---: | ---: | --- | ---: |\n${radios
        .map((radio) => {
          const retries = stats?.interfaces?.radios?.find(
            (candidate) => String(candidate.frequencyGHz) === String(radio.frequencyGHz),
          )?.txRetriesPct;
          return `| ${radio.frequencyGHz} GHz | ${radio.channel} | ${radio.channelWidthMHz} MHz | ${radio.wlanStandard} | ${retries === undefined ? "-" : `${retries}%`} |`;
        })
        .join("\n")}`,
    );
  }

  return sections.join("\n\n") || "No port or radio details are available for this device.";
}

function DevicePortsView({ device, ports, site }: { device: NetworkDevice; ports: NetworkPort[]; site: Site }) {
  const client = useUniFiClient();

  const powerCycle = async (port: NetworkPort) => {
    const confirmed = await confirmAlert({
      title: `Power-cycle port ${port.idx} on ${device.name}?`,
      message: "The connected PoE device will lose power and network connectivity while it restarts.",
      primaryAction: { title: "Power Cycle", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: `Power-cycling port ${port.idx}` });
    try {
      await client.powerCyclePort(site.id, device.id, port.idx);
      toast.style = Toast.Style.Success;
      toast.title = "Power cycle requested";
    } catch (caught) {
      toast.style = Toast.Style.Failure;
      toast.title = "Power cycle failed";
      toast.message = caught instanceof Error ? caught.message : "Unknown error";
    }
  };

  return (
    <List navigationTitle={`${device.name} Ports`}>
      {ports.map((port) => (
        <List.Item
          key={port.idx}
          title={`Port ${port.idx}`}
          subtitle={port.connector.replace("SFPPLUS", "SFP+")}
          icon={stateIcon(port.state)}
          accessories={[
            { text: formatMegabitsPerSecond(port.speedMbps) },
            ...(port.poe
              ? [
                  {
                    tag: {
                      value: `PoE ${port.poe.state}`,
                      color: port.poe.state === "UP" ? Color.Green : Color.Orange,
                    },
                  },
                ]
              : []),
          ]}
          actions={
            <ActionPanel>
              {port.poe?.enabled ? (
                <Action
                  title="Power Cycle PoE Port"
                  icon={Icon.Power}
                  style={Action.Style.Destructive}
                  onAction={() => powerCycle(port)}
                />
              ) : null}
              <Action.CopyToClipboard title="Copy Port Number" content={String(port.idx)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function DeviceDetailsView({ device, site }: { device: NetworkDevice; site: Site }) {
  const client = useUniFiClient();
  const load = useCallback(
    async (signal: AbortSignal) => {
      const [details, statistics] = await Promise.allSettled([
        client.getDevice(site.id, device.id, signal),
        client.getDeviceStatistics(site.id, device.id, signal),
      ]);
      if (details.status === "rejected") throw details.reason;
      return { details: details.value, statistics: statistics.status === "fulfilled" ? statistics.value : undefined };
    },
    [client, device.id, site.id],
  );
  const { data, error, isLoading, revalidate } = useAsyncResource(load);

  const restart = async () => {
    const confirmed = await confirmAlert({
      title: `Restart ${device.name}?`,
      message: "Clients using this device may briefly lose their network connection.",
      primaryAction: { title: "Restart", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: `Restarting ${device.name}` });
    try {
      await client.restartNetworkDevice(site.id, device.id);
      toast.style = Toast.Style.Success;
      toast.title = "Restart requested";
    } catch (caught) {
      toast.style = Toast.Style.Failure;
      toast.title = "Restart failed";
      toast.message = caught instanceof Error ? caught.message : "Unknown error";
    }
  };

  if (error) return <ResourceError error={error} onRetry={revalidate} />;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={device.name}
      markdown={data ? deviceMarkdown(data.details, data.statistics) : ""}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="State" text={device.state} icon={stateIcon(device.state)} />
          <Detail.Metadata.Label title="IP Address" text={device.ipAddress} />
          <Detail.Metadata.Label title="MAC Address" text={device.macAddress} />
          <Detail.Metadata.Label title="Model" text={device.model} />
          <Detail.Metadata.Label title="Firmware" text={device.firmwareVersion} />
          <Detail.Metadata.Label
            title="Update"
            text={device.firmwareUpdatable ? "Available" : "Up to date"}
            icon={device.firmwareUpdatable ? Icon.Download : Icon.Checkmark}
          />
          {data?.details.adoptedAt ? (
            <Detail.Metadata.Label title="Adopted" text={formatDate(data.details.adoptedAt)} />
          ) : null}
          {data?.statistics?.uptimeSec !== undefined ? (
            <Detail.Metadata.Label title="Uptime" text={formatDurationSeconds(data.statistics.uptimeSec)} />
          ) : null}
          {data?.statistics?.cpuUtilizationPct !== undefined ? (
            <Detail.Metadata.Label title="CPU" text={`${data.statistics.cpuUtilizationPct}%`} />
          ) : null}
          {data?.statistics?.memoryUtilizationPct !== undefined ? (
            <Detail.Metadata.Label title="Memory" text={`${data.statistics.memoryUtilizationPct}%`} />
          ) : null}
          {data?.statistics?.uplink ? (
            <Detail.Metadata.Label
              title="Uplink"
              text={`${formatBitsPerSecond(data.statistics.uplink.rxRateBps) ?? "-"} down, ${formatBitsPerSecond(data.statistics.uplink.txRateBps) ?? "-"} up`}
            />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {data?.details.interfaces.ports?.length ? (
            <Action.Push
              title="Manage Ports"
              icon={Icon.Network}
              target={<DevicePortsView device={device} ports={data.details.interfaces.ports} site={site} />}
            />
          ) : null}
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
          {device.state === "ONLINE" ? (
            <Action title="Restart Device" icon={Icon.Power} style={Action.Style.Destructive} onAction={restart} />
          ) : null}
          <Action.CopyToClipboard title="Copy IP Address" content={device.ipAddress} />
          <Action.CopyToClipboard title="Copy MAC Address" content={device.macAddress} />
          <Action.CopyToClipboard title="Copy Device ID" content={device.id} />
        </ActionPanel>
      }
    />
  );
}

type ViewDevicesProps = LaunchProps<{ arguments: { search?: string } }>;

export default function ViewDevices(props: ViewDevicesProps) {
  const client = useUniFiClient();
  const [searchText, setSearchText] = useState(props.arguments.search ?? "");
  const siteLoad = useCallback(() => getSelectedSite(), []);
  const { data: site, isLoading: siteIsLoading } = useAsyncResource(siteLoad);
  const deviceLoad = useCallback(
    (signal: AbortSignal) => (site ? client.listDevices(site.id, signal) : Promise.resolve([])),
    [client, site],
  );
  const { data: devices = [], error, isLoading, revalidate } = useAsyncResource(deviceLoad);
  const sortedDevices = useMemo(
    () =>
      [...devices].sort(
        (a, b) => Number(a.state === "ONLINE") - Number(b.state === "ONLINE") || a.name.localeCompare(b.name),
      ),
    [devices],
  );

  if (!site && !siteIsLoading) return <MissingSite />;
  if (error) return <ResourceError error={error} onRetry={revalidate} />;

  return (
    <List
      isLoading={isLoading || siteIsLoading}
      isShowingDetail
      filtering
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by name, IP, MAC, model, or state"
      searchText={searchText}
    >
      {sortedDevices.map((device) => (
        <List.Item
          key={device.id}
          title={device.name}
          subtitle={device.ipAddress}
          icon={{ source: deviceIcon(device), tintColor: Color.Blue }}
          keywords={[device.id, device.ipAddress, device.macAddress, device.model, device.state, ...device.features]}
          accessories={[
            ...(device.firmwareUpdatable ? [{ icon: Icon.Download, tooltip: "Firmware update available" }] : []),
            { icon: stateIcon(device.state), tooltip: device.state },
          ]}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="State" text={device.state} icon={stateIcon(device.state)} />
                  <List.Item.Detail.Metadata.Label title="IP Address" text={device.ipAddress} />
                  <List.Item.Detail.Metadata.Label title="MAC Address" text={device.macAddress} />
                  <List.Item.Detail.Metadata.Label title="Model" text={device.model} />
                  <List.Item.Detail.Metadata.Label title="Firmware" text={device.firmwareVersion} />
                  <List.Item.Detail.Metadata.TagList title="Features">
                    {device.features.map((feature) => (
                      <List.Item.Detail.Metadata.TagList.Item key={feature} text={feature} color={Color.Blue} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="View Device Details"
                icon={Icon.Sidebar}
                target={<DeviceDetailsView device={device} site={site as Site} />}
              />
              <Action.CopyToClipboard title="Copy IP Address" content={device.ipAddress} />
              <Action.CopyToClipboard title="Copy MAC Address" content={device.macAddress} />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && sortedDevices.length === 0 ? <List.EmptyView title="No devices found" /> : null}
    </List>
  );
}
