import { ActionPanel, getPreferenceValues, List } from "@raycast/api";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { ReactElement, useState } from "react";
import { Preferences, SupportedBrowsers } from "./interfaces";
import { ListEntries } from "./components";
import { ActionOpenPreferences } from "./components/actions";

const arrangeEntries = (entries: ReactElement[], firstInResults: string) => {
  let firstEntries: ReactElement[] = [];

  switch (firstInResults) {
    case SupportedBrowsers.Firefox:
      firstEntries = entries.splice(1, 1);
      break;
    case SupportedBrowsers.Safari:
      firstEntries = entries.splice(2, 1);
      break;
    case SupportedBrowsers.Edge:
      firstEntries = entries.splice(3, 1);
      break;
    case SupportedBrowsers.Brave:
      firstEntries = entries.splice(4, 1);
      break;
    case SupportedBrowsers.Vivaldi:
      firstEntries = entries.splice(5, 1);
      break;
    case SupportedBrowsers.Arc:
      firstEntries = entries.splice(6, 1);
      break;
  }
  entries.unshift(firstEntries[0]);
  return entries;
};

export default function Command(): ReactElement {
  const preferences = getPreferenceValues<Preferences>();
  const enabled =
    preferences.enableChrome ||
    preferences.enableFirefox ||
    preferences.enableSafari ||
    preferences.enableEdge ||
    preferences.enableBrave ||
    preferences.enableVivaldi ||
    preferences.enableArc;
  const [searchText, setSearchText] = useState<string>();

  const isLoading: boolean[] = [];
  const permissionView: any[] = [];

  let entries = Object.entries(preferences)
    .filter(([key, val]) => key.startsWith("enable") && val)
    .map(([key]) => {
      const browser = key.replace("enable", "") as SupportedBrowsers;
      return useHistorySearch(browser, searchText);
    })
    .map((entry) => {
      if (entry.permissionView) {
        permissionView.push(entry.permissionView);
      }
      isLoading.push(entry.isLoading);

      return (
        <List.Section title={entry.browser || ""} key={entry.browser}>
          {entry.data?.map((e) => (
            <ListEntries.HistoryEntry entry={e} key={e.id} />
          ))}
        </List.Section>
      );
    });

  if (permissionView.length > 0) {
    return permissionView[0];
  }

  entries = arrangeEntries(entries, preferences.firstInResults);

  return (
    <List
      onSearchTextChange={function (query) {
        setSearchText(query);
      }}
      isLoading={isLoading.some((e) => e)}
      throttle={false}
    >
      {!enabled ? (
        <List.EmptyView
          title="You haven't enabled any browsers yet"
          description="You can choose which browsers history to integrate in preferences"
          icon={"icon-small.png"}
          actions={
            <ActionPanel>
              <ActionOpenPreferences />
            </ActionPanel>
          }
        />
      ) : (
        entries
      )}
    </List>
  );
}
