import { ActionPanel, getPreferenceValues, List } from "@raycast/api";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { ReactElement, useState } from "react";
import { Preferences, SupportedBrowsers } from "./interfaces";
import { BrowserHistoryActions, ListEntries } from "./components";

export default function Command(): ReactElement {
  const preferences = getPreferenceValues<Preferences>();
  const enabled = Object.entries(preferences).filter(([key, value]) => key.startsWith("enable") && value).length > 0;
  const [searchText, setSearchText] = useState<string>();

  const isLoading: boolean[] = [];
  const permissionView: any[] = [];

  let entries = Object.entries(preferences)
    .filter(([key, val]) => key.startsWith("enable") && val)
    .map(([key], idx) => useHistorySearch(key.replace("enable", "") as SupportedBrowsers, searchText))
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

  entries.sort((a, b) => a.props.title.localeCompare(b.props.title));

  if (preferences.firstInResults) {
    const firstEntry = entries.filter((e) => e.props.title === preferences.firstInResults);
    entries = [firstEntry[0], ...entries.filter((e) => e.props.title !== preferences.firstInResults)];
  }

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
              <BrowserHistoryActions.OpenPreferences />
            </ActionPanel>
          }
        />
      ) : (
        entries
      )}
    </List>
  );
}
