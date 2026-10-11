import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { DeviceListItem } from "./components/DeviceListItem";
import { EmptyView } from "./components/EmptyView";
import { DEVICE_CATEGORIES } from "./devices/catalog";
import { useDevices } from "./hooks/useDevices";
import type { DeviceCategory } from "./types/device";

type Filter = "all" | "online" | DeviceCategory;

export default function EcoFlowDashboardCommand() {
  const { data = [], error, isLoading, revalidate } = useDevices();
  const [filter, setFilter] = useState<Filter>("all");

  const devices = useMemo(
    () =>
      data.filter((device) => {
        if (filter === "all") return true;
        if (filter === "online") return device.online;
        return device.profile.category === filter;
      }),
    [data, filter],
  );
  const online = devices.filter((device) => device.online);
  const offline = devices.filter((device) => !device.online);
  const refresh = () => void revalidate();

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search devices, product families, or serial numbers..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Devices" value={filter} onChange={(value) => setFilter(value as Filter)}>
          <List.Dropdown.Item title="All Devices" value="all" icon={Icon.Globe} />
          <List.Dropdown.Item title="Online" value="online" icon={Icon.CircleFilled} />
          <List.Dropdown.Section title="Device Category">
            {DEVICE_CATEGORIES.map((definition) => (
              <List.Dropdown.Item
                key={definition.category}
                title={definition.pluralLabel}
                value={definition.category}
                icon={{ source: definition.emoji }}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {online.length > 0 && (
        <List.Section title="Online Devices" subtitle={String(online.length)}>
          {online.map((device) => (
            <DeviceListItem key={device.serialNumber} device={device} onRefresh={refresh} />
          ))}
        </List.Section>
      )}
      {offline.length > 0 && (
        <List.Section title="Offline Devices" subtitle={String(offline.length)}>
          {offline.map((device) => (
            <DeviceListItem key={device.serialNumber} device={device} onRefresh={refresh} />
          ))}
        </List.Section>
      )}
      {devices.length === 0 && data.length > 0 && !error ? (
        <List.EmptyView
          icon={Icon.Filter}
          title="No Matching Devices"
          description="No EcoFlow devices match the selected filter."
          actions={
            <ActionPanel>
              <Action title="Show All Devices" icon={Icon.Globe} onAction={() => setFilter("all")} />
            </ActionPanel>
          }
        />
      ) : (
        devices.length === 0 && <EmptyView isLoading={isLoading} error={error} onRetry={refresh} />
      )}
    </List>
  );
}
