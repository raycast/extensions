import { useMemo, useState } from "react";
import { Action, ActionPanel, Color, Icon, List, getPreferenceValues } from "@raycast/api";
import { BrowserItemActions } from "./components/BrowserItemActions";
import { FallbackSearchItem } from "./components/FallbackSearchItem";
import { NotInstalledView } from "./components/NotInstalledView";
import { useOpenTabs, useSearchInstalled } from "./hooks/useSearchBrowser";
import { PRIVACY_AUTOMATION_URL } from "./lib/constants";
import { getSiteIcon, getSpaceColor } from "./lib/data";
import { getDomain, matchesQuery } from "./lib/utils";

export default function SearchTabsCommand() {
  const [searchText, setSearchText] = useState("");
  const [selectedSpace, setSelectedSpace] = useState("all");
  const preferences = getPreferenceValues<Preferences>();

  const { data: installed, isLoading: checkingInstall } = useSearchInstalled();
  const { data, error, isLoading, revalidate } = useOpenTabs();

  const includeRemote = preferences.includeRemoteTabs !== false;
  const includePins = preferences.includePinnedTabs !== false;

  const spaceOptions = useMemo(() => {
    const names = new Set<string>();
    for (const s of data?.spaces ?? []) names.add(s.name);
    for (const t of data?.tabs ?? []) {
      if (t.space !== "Unknown Space") names.add(t.space);
    }
    for (const p of data?.pins ?? []) {
      if (p.spaceName !== "Shared") names.add(p.spaceName);
    }
    return Array.from(names);
  }, [data]);

  const filteredTabs = useMemo(() => {
    return (data?.tabs ?? []).filter((tab) => {
      if (selectedSpace !== "all" && tab.space !== selectedSpace) return false;
      return matchesQuery(searchText, tab.title, tab.url, tab.space, tab.profile);
    });
  }, [data, searchText, selectedSpace]);

  const filteredPins = useMemo(() => {
    if (!includePins) return [];
    return (data?.pins ?? []).filter((pin) => {
      if (selectedSpace !== "all" && pin.spaceName !== selectedSpace && pin.spaceName !== "Shared") return false;
      return matchesQuery(searchText, pin.title, pin.url, pin.spaceName, pin.folderName);
    });
  }, [data, searchText, selectedSpace, includePins]);

  const filteredRemoteDevices = useMemo(() => {
    if (!includeRemote || selectedSpace !== "all") return [];
    return (data?.remoteDevices ?? [])
      .map((device) => ({
        ...device,
        tabs: device.tabs.filter((t) => matchesQuery(searchText, t.title, t.url, device.deviceName)),
      }))
      .filter((device) => device.tabs.length > 0);
  }, [data, searchText, selectedSpace, includeRemote]);

  // Group open tabs by Space (and friendly Window 1 / Window 2 index when multiple windows exist)
  const groupedTabSections = useMemo(() => {
    const groups = new Map<string, typeof filteredTabs>();
    const windowOrder = new Map<number, number>();
    for (const tab of filteredTabs) {
      if (!windowOrder.has(tab.windowId)) {
        windowOrder.set(tab.windowId, windowOrder.size + 1);
      }
    }
    const multiWindow = windowOrder.size > 1;
    const isLive = Boolean(data?.isRunning && !data?.permissionDenied);

    for (const tab of filteredTabs) {
      const baseLabel = isLive ? tab.space : `${tab.space} (Last Session)`;
      const windowNum = windowOrder.get(tab.windowId) ?? 1;
      const key = multiWindow ? `${baseLabel} · Window ${windowNum}` : baseLabel;
      const list = groups.get(key) ?? [];
      list.push(tab);
      groups.set(key, list);
    }

    return Array.from(groups.entries());
  }, [filteredTabs, data?.isRunning, data?.permissionDenied]);

  if (!checkingInstall && installed === false) {
    return <NotInstalledView />;
  }

  const spaces = data?.spaces ?? [];
  const hasResults = filteredTabs.length > 0 || filteredPins.length > 0 || filteredRemoteDevices.length > 0;

  return (
    <List
      isLoading={checkingInstall || isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search open tabs in Search Browser..."
      filtering={false}
      searchBarAccessory={
        spaceOptions.length > 1 ? (
          <List.Dropdown tooltip="Filter by Space" value={selectedSpace} onChange={setSelectedSpace}>
            <List.Dropdown.Item title="All Spaces" value="all" icon={Icon.Layers} />
            {spaceOptions.map((name) => (
              <List.Dropdown.Item
                key={name}
                title={name}
                value={name}
                icon={{ source: Icon.CircleFilled, tintColor: getSpaceColor(name, spaces) }}
              />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {error && (
        <List.Section title="Data Read Error">
          <List.Item
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
            title="Failed to read Search Browser data"
            subtitle={error.message}
            actions={
              <ActionPanel>
                <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {data?.permissionDenied && (
        <List.Section title="Permission Required">
          <List.Item
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
            title="Allow Raycast to read live tabs from Search Browser"
            subtitle="Showing saved session tabs until Automation permission is granted"
            actions={
              <ActionPanel>
                <Action.Open title="Open Automation Settings" target={PRIVACY_AUTOMATION_URL} icon={Icon.Gear} />
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {groupedTabSections.map(([sectionTitle, tabs]) => (
        <List.Section key={sectionTitle} title={sectionTitle} subtitle={`${tabs.length}`}>
          {tabs.map((tab) => {
            const accessories: List.Item.Accessory[] = [];
            if (tab.source === "live" && tab.isActive && !isLoading) {
              accessories.push({ tag: { value: "Active", color: Color.Green } });
            }
            if (tab.profile && tab.profile !== "Personal" && tab.profile !== tab.space) {
              accessories.push({ tag: tab.profile, icon: Icon.Person });
            }
            const spaceHasPins = (data?.pins ?? []).some((p) => p.spaceName === tab.space || p.spaceName === "Shared");

            return (
              <List.Item
                key={tab.id}
                icon={getSiteIcon(tab.url)}
                title={tab.title}
                subtitle={getDomain(tab.url)}
                accessories={accessories}
                actions={
                  <BrowserItemActions
                    title={tab.title}
                    url={tab.url}
                    tab={tab}
                    hasPinnedTabs={spaceHasPins}
                    isLoading={isLoading}
                    onRefresh={revalidate}
                  />
                }
              />
            );
          })}
        </List.Section>
      ))}

      {filteredPins.length > 0 && (
        <List.Section title="Pinned Tabs" subtitle={`${filteredPins.length}`}>
          {filteredPins.map((pin) => (
            <List.Item
              key={pin.id}
              icon={getSiteIcon(pin.url)}
              title={pin.title}
              subtitle={getDomain(pin.url)}
              accessories={[
                ...(pin.folderName ? [{ tag: pin.folderName }] : []),
                ...(spaces.length > 1
                  ? [{ tag: { value: pin.spaceName, color: getSpaceColor(pin.spaceName, spaces) } }]
                  : []),
                { icon: Icon.Pin, tooltip: "Pinned" },
              ]}
              actions={<BrowserItemActions title={pin.title} url={pin.url} onRefresh={revalidate} />}
            />
          ))}
        </List.Section>
      )}

      {filteredRemoteDevices.map((device) => (
        <List.Section key={device.deviceId} title={`iCloud · ${device.deviceName}`} subtitle={`${device.tabs.length}`}>
          {device.tabs.map((tab) => (
            <List.Item
              key={tab.id}
              icon={getSiteIcon(tab.url)}
              title={tab.title}
              subtitle={getDomain(tab.url)}
              accessories={[{ icon: Icon.Cloud, tooltip: device.deviceName }]}
              actions={<BrowserItemActions title={tab.title} url={tab.url} onRefresh={revalidate} />}
            />
          ))}
        </List.Section>
      ))}

      {searchText.trim() && (
        <List.Section title={hasResults ? "Web" : "Search Web"}>
          <FallbackSearchItem query={searchText} browserSettings={data?.settings} />
        </List.Section>
      )}

      {!hasResults && !error && !searchText.trim() && !isLoading && (
        <List.EmptyView
          icon={Icon.AppWindowList}
          title="No Open Tabs Found"
          description="Open a page in Search Browser to see your tabs here. Private tabs are hidden for privacy."
        />
      )}
    </List>
  );
}
