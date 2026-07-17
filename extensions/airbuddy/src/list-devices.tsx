import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import { DeviceActions } from "./components/device-actions";
import { DeviceListItem } from "./components/device-list-item";
import { ErrorView } from "./components/error-views";
import { useDevices } from "./hooks/use-devices";
import { OTHER_SECTION, type Device, sectionFor } from "./types";

type Filter = "all" | "connected" | "headsets" | "known";

// Fixed order — the list must not reshuffle as devices appear and disappear (and they do: AirPods
// leave the feed entirely when they go back in their case). OTHER_SECTION is last and normally
// empty; it exists so a device kind AirBuddy adds later still renders, because this array is what
// decides which sections get drawn at all.
const SECTION_ORDER = [
  "AirPods",
  "Macs",
  "iPhones, iPads, and Apple Watch",
  "Keyboards, Mice, and Other Peripherals",
  OTHER_SECTION,
];

function applyFilter(devices: Device[], filter: Filter): Device[] {
  switch (filter) {
    case "connected":
      return devices.filter((d) => d.connected);
    case "headsets":
      return devices.filter((d) => d.kind === "headset");
    case "known":
      return devices;
    // AirBuddy 911 broadened `devices()` from live-only to the full known roster (26 devices on a
    // real Mac vs. 4-5 before) — "All Devices" defaulting to that full dump would silently surface
    // devices the user hasn't seen in months. Default to nearby-or-connected; "Known Devices" is the
    // explicit opt-in to the full roster.
    case "all":
    default:
      return devices.filter((d) => d.nearby || d.connected);
  }
}

/**
 * The empty state has to answer "why is this empty?", and the answer differs by filter.
 *
 * AirBuddy 911 can now see the FULL known roster (26 devices vs. 4-5 before), but "All Devices" here
 * still shows only nearby-or-connected ones by default (see `applyFilter`) — dumping every device
 * the user has ever paired, most of them offline, would be a worse first view than the old
 * live-only one. "Known Devices" is the explicit escape hatch to the full roster.
 */
function EmptyState({
  filter,
  isLoading,
  onShowAll,
  onShowKnown,
}: {
  filter: Filter;
  isLoading: boolean;
  onShowAll: () => void;
  onShowKnown: () => void;
}) {
  if (isLoading) {
    // No description: a spinner plus a sentence of explanation is noise for something that
    // resolves in well under a second.
    return <List.EmptyView icon={Icon.Bluetooth} title="Looking for Devices…" />;
  }

  const showAllAction = (
    <ActionPanel>
      <Action title="Show All Devices" icon={Icon.Devices} onAction={onShowAll} />
    </ActionPanel>
  );

  const showKnownAction = (
    <ActionPanel>
      <Action title="Show Known Devices" icon={Icon.List} onAction={onShowKnown} />
    </ActionPanel>
  );

  switch (filter) {
    case "headsets":
      return (
        <List.EmptyView
          icon={Icon.Airpods}
          title="No Headsets Nearby"
          description="AirPods only appear when they're out of their case. Take them out, or switch back to All Devices."
          actions={showAllAction}
        />
      );

    case "connected":
      return (
        <List.EmptyView
          icon={Icon.Plug}
          title="Nothing Connected"
          description="No device is currently connected to this Mac. Switch to All Devices to see what's nearby."
          actions={showAllAction}
        />
      );

    case "known":
      return (
        <List.EmptyView icon={Icon.List} title="No Known Devices" description="AirBuddy hasn't seen any devices yet." />
      );

    case "all":
    default:
      return (
        <List.EmptyView
          icon={Icon.Bluetooth}
          title="No Devices Nearby"
          description="Turn a device on, or take your AirPods out of their case. To see devices AirBuddy has paired with before but can't see right now, switch to Known Devices."
          actions={showKnownAction}
        />
      );
  }
}

export default function Command() {
  const { devices, isLoading, error, isFailing, revalidate } = useDevices();
  const [filter, setFilter] = useState<Filter>("all");

  // Surrender the list when there's nothing to show, OR when the failure is PERSISTENT.
  //
  // useCachedPromise sets `error` on ANY failed fetch — including one flaky 5s poll against a beta
  // app talking to the Bluetooth daemon. An unconditional `if (error)` would unmount the list
  // mid-use, losing the user's typed search, then silently restore it 5s later. So a transient
  // failure stays invisible (`keepPreviousData` holds the last good devices).
  //
  // But `devices.length === 0` alone was not enough either: if AirBuddy QUITS after the list has
  // loaded, every poll fails while stale rows sit there forever — showing connection and battery
  // state that is no longer true, with no error and no recovery path. `isFailing` (2+ consecutive
  // failures) distinguishes an outage from a hiccup.
  if (error && (devices.length === 0 || isFailing)) {
    return (
      <List>
        <ErrorView error={error} onRetry={revalidate} />
      </List>
    );
  }

  const filtered = applyFilter(devices, filter);

  const grouped = new Map<string, Device[]>();
  for (const device of filtered) {
    const section = sectionFor(device);
    const existing = grouped.get(section);
    if (existing) existing.push(device);
    else grouped.set(section, [device]);
  }

  const sections = SECTION_ORDER.filter((title) => grouped.has(title));

  return (
    <List
      // Only true until the FIRST fetch resolves. The 5s background poll refreshes silently —
      // a loading bar that pulses every 5 seconds reads as a broken list.
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Devices" value={filter} onChange={(v) => setFilter(v as Filter)}>
          <List.Dropdown.Item title="All Devices" value="all" icon={Icon.Devices} />
          <List.Dropdown.Item title="Connected" value="connected" icon={Icon.Plug} />
          <List.Dropdown.Item title="Headsets" value="headsets" icon={Icon.Airpods} />
          {/* NEW in AirBuddy 911: `devices()` returns the full known roster, not just live ones. */}
          <List.Dropdown.Item title="Known Devices" value="known" icon={Icon.List} />
        </List.Dropdown>
      }
    >
      {sections.length === 0 ? (
        <EmptyState
          filter={filter}
          isLoading={isLoading}
          onShowAll={() => setFilter("all")}
          onShowKnown={() => setFilter("known")}
        />
      ) : (
        sections.map((title) => (
          <List.Section key={title} title={title} subtitle={String(grouped.get(title)?.length ?? 0)}>
            {grouped.get(title)?.map((device) => (
              <DeviceListItem
                key={device.id}
                device={device}
                actions={<DeviceActions device={device} onRefresh={revalidate} />}
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
