import { useMemo, useState } from "react";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { pluralize, wellKnownPort } from "./core/ports";
import { Exposure, IpVersion, Listener } from "./core/types";
import { HiddenListenerItem } from "./ui/hidden-listener-item";
import { ListenerActions } from "./ui/listener-actions";
import { ListenerDetail } from "./ui/listener-detail";
import { getSettings } from "./ui/preferences";
import { exposureMeta, ipVersionLabel, listItemIcon } from "./ui/presentation";
import { SHORTCUTS } from "./ui/shortcuts";
import { useListeners } from "./ui/use-listeners";

type Filter = "all" | "localhost" | "network" | "ipv4" | "ipv6";

const FILTER_TITLES: Record<Filter, string> = {
  all: "Listening Ports",
  localhost: "Localhost Only",
  network: "Reachable from the Network",
  ipv4: "IPv4 Listeners",
  ipv6: "IPv6 Listeners",
};

export default function ViewOpenPorts() {
  const settings = getSettings();
  const [showingDetail, setShowingDetail] = useState(settings.showDetailByDefault);
  const [filter, setFilter] = useState<Filter>("all");
  const { listeners, processes, hidden, isLoading, isElevated, revalidate, reloadAsAdmin } = useListeners();

  const visible = useMemo(() => listeners.filter((listener) => matchesFilter(listener, filter)), [listeners, filter]);
  const visibleHidden = useMemo(() => hidden.filter((entry) => matchesFilter(entry, filter)), [hidden, filter]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail && visible.length > 0}
      searchBarPlaceholder="Search by port, process, PID, user or address…"
      navigationTitle="Open Ports"
      searchBarAccessory={<FilterDropdown value={filter} onChange={setFilter} />}
    >
      <List.EmptyView
        icon={{ source: Icon.Plug, tintColor: Color.SecondaryText }}
        title={isLoading ? "Reading open ports…" : "No listening ports"}
        description={
          isElevated
            ? "Nothing matches the current filter."
            : "Nothing matches the current filter. Some listeners belong to other users and stay hidden until the scan runs with administrator rights."
        }
        actions={
          <ActionPanel>
            <Action title="Reload" icon={Icon.ArrowClockwise} shortcut={SHORTCUTS.reload} onAction={revalidate} />
            <Action
              title="Reload as Administrator"
              icon={Icon.Key}
              shortcut={SHORTCUTS.reloadAsAdmin}
              onAction={reloadAsAdmin}
            />
          </ActionPanel>
        }
      />

      <List.Section
        title={FILTER_TITLES[filter]}
        subtitle={visible.length > 0 ? pluralize(visible.length, "listener") : undefined}
      >
        {visible.map((listener) => (
          <List.Item
            key={listener.id}
            icon={listItemIcon(listener)}
            title={String(listener.port)}
            subtitle={listener.command}
            keywords={keywordsFor(listener)}
            accessories={accessoriesFor(listener, showingDetail)}
            detail={<ListenerDetail listener={listener} details={processes.get(listener.pid)} />}
            actions={
              <ListenerActions
                listener={listener}
                details={processes.get(listener.pid)}
                onChanged={revalidate}
                onReloadAsAdmin={reloadAsAdmin}
                isShowingDetail={showingDetail}
                onToggleDetail={() => setShowingDetail((current) => !current)}
              />
            }
          />
        ))}
      </List.Section>

      {visibleHidden.length > 0 ? (
        <List.Section title="Owned by Another User" subtitle={pluralize(visibleHidden.length, "listener")}>
          {visibleHidden.map((entry) => (
            <HiddenListenerItem
              key={entry.id}
              hidden={entry}
              onReload={revalidate}
              onReloadAsAdmin={reloadAsAdmin}
              withDetail={showingDetail}
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

function FilterDropdown({ value, onChange }: { value: Filter; onChange: (value: Filter) => void }) {
  return (
    <List.Dropdown tooltip="Filter listeners" value={value} onChange={(next) => onChange(next as Filter)} storeValue>
      <List.Dropdown.Item title="All Listeners" value="all" icon={Icon.Plug} />
      <List.Dropdown.Section title="Exposure">
        <List.Dropdown.Item title="Localhost Only" value="localhost" icon={Icon.Lock} />
        <List.Dropdown.Item title="Reachable from Network" value="network" icon={Icon.Globe} />
      </List.Dropdown.Section>
      <List.Dropdown.Section title="IP Version">
        <List.Dropdown.Item title="IPv4" value="ipv4" icon={Icon.Network} />
        <List.Dropdown.Item title="IPv6" value="ipv6" icon={Icon.Network} />
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function matchesFilter(entry: { exposure: Exposure; ipVersions: IpVersion[] }, filter: Filter): boolean {
  switch (filter) {
    case "localhost":
      return entry.exposure === "loopback";
    case "network":
      return entry.exposure !== "loopback";
    case "ipv4":
      return entry.ipVersions.includes("IPv4");
    case "ipv6":
      return entry.ipVersions.includes("IPv6");
    case "all":
      return true;
  }
}

function keywordsFor(listener: Listener): string[] {
  const service = wellKnownPort(listener.port);
  return [
    listener.command,
    listener.user,
    String(listener.pid),
    `:${listener.port}`,
    ...listener.ipVersions,
    ...listener.bindings.map((binding) => binding.address),
    ...listener.bindings.map((binding) => binding.host),
    ...(service ? [service] : []),
  ];
}

function accessoriesFor(listener: Listener, showingDetail: boolean): List.Item.Accessory[] {
  const exposure = exposureMeta(listener.exposure);

  // The detail panel takes most of the width, so the list keeps only the identifier.
  if (showingDetail) {
    return [{ tag: { value: String(listener.pid), color: Color.SecondaryText }, tooltip: `PID ${listener.pid}` }];
  }

  return [
    {
      text: { value: listener.bindings.map((binding) => binding.address).join("  "), color: Color.SecondaryText },
      tooltip: exposure.description,
    },
    { tag: { value: ipVersionLabel(listener), color: exposure.color }, tooltip: exposure.description },
    { icon: Icon.Person, text: listener.user, tooltip: `User ${listener.user}` },
    { text: `PID ${listener.pid}`, tooltip: `Process ID ${listener.pid}` },
  ];
}
