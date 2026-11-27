import { useMemo, useState } from "react";
import { Action, ActionPanel, Color, Icon, List, getPreferenceValues } from "@raycast/api";
import { BrowserItemActions } from "./components/BrowserItemActions";
import { FallbackSearchItem } from "./components/FallbackSearchItem";
import { NotInstalledView } from "./components/NotInstalledView";
import { useSearchInstalled, useUnifiedSearchData } from "./hooks/useSearchBrowser";
import { PRIVACY_AUTOMATION_URL, SearchEngineId } from "./lib/constants";
import { getSiteIcon, getSpaceColor } from "./lib/data";
import { buildNavigableUrl, formatVisitTime, getDomain, matchesQuery, normalizeUrlKey } from "./lib/utils";

type FilterKind = "all" | "tabs" | "pins" | "bookmarks" | "history";

export default function SearchAllCommand() {
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState<FilterKind>("all");
  const preferences = getPreferenceValues<Preferences>();

  const { data: installed, isLoading: checkingInstall } = useSearchInstalled();
  const { data, isLoading, revalidate } = useUnifiedSearchData();

  const includeRemote = preferences.includeRemoteTabs !== false;
  const includePins = preferences.includePinnedTabs !== false;

  const filtered = useMemo(() => {
    const spaces = data?.spaces ?? [];
    const tabs = (data?.tabs ?? []).filter((t) => matchesQuery(searchText, t.title, t.url, t.space, t.profile));
    const pins = includePins
      ? (data?.pins ?? []).filter((p) => matchesQuery(searchText, p.title, p.url, p.spaceName, p.folderName))
      : [];
    const remoteTabs = includeRemote
      ? (data?.remoteDevices ?? []).flatMap((d) =>
          d.tabs.filter((t) => matchesQuery(searchText, t.title, t.url, d.deviceName))
        )
      : [];
    const bookmarks = (data?.bookmarks ?? []).filter((b) => matchesQuery(searchText, b.title, b.url, b.folderLabel));

    const shownKeys = new Set<string>();
    if (filter === "all") {
      for (const t of tabs) shownKeys.add(normalizeUrlKey(t.url));
      for (const b of bookmarks) shownKeys.add(normalizeUrlKey(b.url));
    }

    const history = (data?.history ?? [])
      .filter((h) => matchesQuery(searchText, h.title, h.url))
      .filter((h) => (filter === "all" ? !shownKeys.has(normalizeUrlKey(h.url)) : true))
      .slice(0, searchText.trim() ? 60 : 30);

    return { spaces, tabs, pins, remoteTabs, bookmarks, history };
  }, [data, searchText, filter, includeRemote, includePins]);

  if (!checkingInstall && installed === false) {
    return <NotInstalledView />;
  }

  const trimmedQuery = searchText.trim();
  const fallback = trimmedQuery
    ? buildNavigableUrl(trimmedQuery, preferences.searchEngine as SearchEngineId | undefined, data?.settings)
    : null;
  const fallbackTitle = fallback
    ? fallback.isSearch
      ? `Search ${fallback.engineName} for "${trimmedQuery}"`
      : `Open "${trimmedQuery}"`
    : undefined;

  const showTabs = filter === "all" || filter === "tabs";
  const showPins = (filter === "all" || filter === "pins") && includePins;
  const showBookmarks = filter === "all" || filter === "bookmarks";
  const showHistory = filter === "all" || filter === "history";

  const hasAnyResults =
    (showTabs && (filtered.tabs.length > 0 || filtered.remoteTabs.length > 0)) ||
    (showPins && filtered.pins.length > 0) ||
    (showBookmarks && filtered.bookmarks.length > 0) ||
    (showHistory && filtered.history.length > 0);

  const tabsSectionTitle = data?.permissionDenied
    ? "Last Session Tabs (Automation Permission Needed)"
    : data?.isRunning
      ? "Open Tabs"
      : "Last Session Tabs";

  return (
    <List
      isLoading={checkingInstall || isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search tabs, bookmarks, history, or enter a URL..."
      filtering={false}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Results" value={filter} onChange={(val) => setFilter(val as FilterKind)}>
          <List.Dropdown.Item title="All" value="all" icon={Icon.MagnifyingGlass} />
          <List.Dropdown.Item title="Open Tabs" value="tabs" icon={Icon.AppWindowList} />
          {includePins && <List.Dropdown.Item title="Pinned Tabs" value="pins" icon={Icon.Pin} />}
          <List.Dropdown.Item title="Bookmarks" value="bookmarks" icon={Icon.Bookmark} />
          <List.Dropdown.Item title="History" value="history" icon={Icon.Clock} />
        </List.Dropdown>
      }
    >
      {showTabs && data?.permissionDenied && (
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

      {showTabs && filtered.tabs.length > 0 && (
        <List.Section title={tabsSectionTitle} subtitle={`${filtered.tabs.length}`}>
          {filtered.tabs.map((tab) => {
            const accessories: List.Item.Accessory[] = [];
            if (tab.source === "live" && tab.isActive && !isLoading) {
              accessories.push({ tag: { value: "Active", color: Color.Green } });
            }
            if (filtered.spaces.length > 1 || (tab.space !== "Personal" && tab.space !== "Unknown Space")) {
              accessories.push({
                tag: { value: tab.space, color: getSpaceColor(tab.space, filtered.spaces) },
              });
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
                    searchFallbackUrl={fallback?.url}
                    searchFallbackTitle={fallbackTitle}
                  />
                }
              />
            );
          })}
        </List.Section>
      )}

      {showTabs && filtered.remoteTabs.length > 0 && (
        <List.Section title="iCloud Tabs" subtitle={`${filtered.remoteTabs.length}`}>
          {filtered.remoteTabs.map((tab) => (
            <List.Item
              key={tab.id}
              icon={getSiteIcon(tab.url)}
              title={tab.title}
              subtitle={getDomain(tab.url)}
              accessories={[{ tag: tab.deviceName, icon: Icon.Cloud }]}
              actions={
                <BrowserItemActions
                  title={tab.title}
                  url={tab.url}
                  onRefresh={revalidate}
                  searchFallbackUrl={fallback?.url}
                  searchFallbackTitle={fallbackTitle}
                />
              }
            />
          ))}
        </List.Section>
      )}

      {showPins && filtered.pins.length > 0 && (
        <List.Section title="Pinned Tabs" subtitle={`${filtered.pins.length}`}>
          {filtered.pins.map((pin) => {
            const accessories: List.Item.Accessory[] = [];
            if (pin.folderName) {
              accessories.push({ tag: pin.folderName });
            }
            if (filtered.spaces.length > 1 || pin.spaceName !== "Personal") {
              accessories.push({
                tag: { value: pin.spaceName, color: getSpaceColor(pin.spaceName, filtered.spaces) },
              });
            }
            accessories.push({ icon: Icon.Pin, tooltip: "Pinned Tab" });

            return (
              <List.Item
                key={pin.id}
                icon={getSiteIcon(pin.url)}
                title={pin.title}
                subtitle={getDomain(pin.url)}
                accessories={accessories}
                actions={
                  <BrowserItemActions
                    title={pin.title}
                    url={pin.url}
                    onRefresh={revalidate}
                    searchFallbackUrl={fallback?.url}
                    searchFallbackTitle={fallbackTitle}
                  />
                }
              />
            );
          })}
        </List.Section>
      )}

      {showBookmarks && filtered.bookmarks.length > 0 && (
        <List.Section title="Bookmarks" subtitle={`${filtered.bookmarks.length}`}>
          {filtered.bookmarks.map((bm) => (
            <List.Item
              key={bm.id}
              icon={getSiteIcon(bm.url)}
              title={bm.title}
              subtitle={getDomain(bm.url)}
              accessories={[{ tag: bm.folderLabel, icon: Icon.Folder }]}
              actions={
                <BrowserItemActions
                  title={bm.title}
                  url={bm.url}
                  onRefresh={revalidate}
                  searchFallbackUrl={fallback?.url}
                  searchFallbackTitle={fallbackTitle}
                />
              }
            />
          ))}
        </List.Section>
      )}

      {showHistory && filtered.history.length > 0 && (
        <List.Section title="History" subtitle={`${filtered.history.length}`}>
          {filtered.history.map((entry) => (
            <List.Item
              key={entry.id}
              icon={getSiteIcon(entry.url)}
              title={entry.title}
              subtitle={getDomain(entry.url)}
              accessories={[
                ...(entry.visitCount > 1
                  ? [{ text: `${entry.visitCount}×`, tooltip: `${entry.visitCount} visits` }]
                  : []),
                { text: formatVisitTime(entry.lastVisited), tooltip: entry.lastVisited.toLocaleString() },
              ]}
              actions={
                <BrowserItemActions
                  title={entry.title}
                  url={entry.url}
                  onRefresh={revalidate}
                  searchFallbackUrl={fallback?.url}
                  searchFallbackTitle={fallbackTitle}
                />
              }
            />
          ))}
        </List.Section>
      )}

      {trimmedQuery && (
        <List.Section title={hasAnyResults ? "Web" : "Search Web"}>
          <FallbackSearchItem query={trimmedQuery} browserSettings={data?.settings} />
        </List.Section>
      )}

      {!hasAnyResults && !trimmedQuery && !isLoading && (
        <List.EmptyView
          icon={Icon.Globe}
          title="No Results Yet"
          description="Open tabs, bookmark pages, or start browsing in Search Browser."
        />
      )}
    </List>
  );
}
