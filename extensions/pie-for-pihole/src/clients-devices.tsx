import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getPiholeAPI } from "./api/client";
import { isV6 } from "./utils";

export default function ClientsDevices() {
  const [view, setView] = useState("top-clients");

  const {
    isLoading: isLoadingClients,
    data: clients,
    revalidate: revalidateClients,
  } = useCachedPromise(() => getPiholeAPI().getTopClients(25), [], {
    execute: view === "top-clients",
  });

  const {
    isLoading: isLoadingDevices,
    data: devices,
    revalidate: revalidateDevices,
  } = useCachedPromise(() => getPiholeAPI().getNetworkDevices(), [], {
    execute: view === "network-devices",
  });

  const isLoading = view === "top-clients" ? isLoadingClients : isLoadingDevices;
  const revalidate = view === "top-clients" ? revalidateClients : revalidateDevices;

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Clients & Devices"
      searchBarPlaceholder={view === "top-clients" ? "Search clients" : "Search devices"}
      searchBarAccessory={
        <List.Dropdown tooltip="View" storeValue={false} onChange={setView}>
          <List.Dropdown.Item title="Top Clients" value="top-clients" />
          {isV6() && <List.Dropdown.Item title="Network Devices" value="network-devices" />}
        </List.Dropdown>
      }
    >
      <List.EmptyView title={view === "top-clients" ? "No clients found" : "No network devices found"} />
      {view === "top-clients" &&
        clients?.map((client, index) => (
          <List.Item
            key={`${client.ip}-${index}`}
            title={client.name}
            subtitle={client.name !== client.ip ? client.ip : undefined}
            icon={{ source: Icon.Monitor, tintColor: Color.Blue }}
            accessories={[{ text: `${client.count} queries` }]}
            actions={
              <ActionPanel title="Actions">
                <Action.CopyToClipboard title="Copy IP Address" content={client.ip} />
                <Action.CopyToClipboard title="Copy Hostname" content={client.name} />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        ))}
      {view === "network-devices" &&
        devices?.map((device) => (
          <List.Item
            key={device.id}
            title={device.name || device.ip || device.hwaddr}
            subtitle={device.name ? device.ip : undefined}
            icon={{ source: Icon.Globe, tintColor: Color.Purple }}
            accessories={[
              { text: `${device.numQueries} queries` },
              ...(device.macVendor
                ? [
                    {
                      tag: {
                        value: device.macVendor,
                        color: Color.SecondaryText,
                      },
                    },
                  ]
                : []),
            ]}
            actions={
              <ActionPanel title="Actions">
                {device.ip && <Action.CopyToClipboard title="Copy IP Address" content={device.ip} />}
                <Action.CopyToClipboard title="Copy MAC Address" content={device.hwaddr} />
                {device.name && <Action.CopyToClipboard title="Copy Hostname" content={device.name} />}
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
