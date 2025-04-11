import { ActionPanel, Action, getPreferenceValues, List } from "@raycast/api";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { ReactElement, isValidElement, useState } from "react";
import { Preferences, SupportedBrowsers } from "./interfaces";
import { BrowserHistoryActions, ListEntries } from "./components";

export default function Command(): ReactElement {
  const preferences = getPreferenceValues<Preferences>();
  const enabled = Object.entries(preferences).filter(([key, value]) => key.startsWith("enable") && value).length > 0;
  const [searchText, setSearchText] = useState<string>();

  const isLoading: boolean[] = [];
  const permissionView: ReactElement[] = [];
  let noHistory = true;
  const searchTextEncoded = encodeURIComponent(searchText ?? "");
  const searchEngine = preferences.searchEngine;
  const searchUrl = searchEngine
    ? searchEngine.replace(/{{query}}/g, searchTextEncoded)
    : `https://www.google.com/search?q=${searchTextEncoded}`;

  let entries = Object.entries(preferences)
    .filter(([key, val]) => key.startsWith("enable") && val)
    .map(([key]) => useHistorySearch(key.replace("enable", "") as SupportedBrowsers, searchText))
    .map((entry) => {
      if (entry.permissionView) {
        if (entry.permissionView && isValidElement(entry.permissionView)) {
          permissionView.push(entry.permissionView);
        }
      }
      isLoading.push(entry.isLoading);

      if ((entry.data?.length ?? 0) > 0) {
        noHistory = false;
      }

      return (
        <List.Section title={entry.browser || ""} key={entry.browser}>
          {entry.data?.map((e) => <ListEntries.HistoryEntry entry={e} key={e.id} />)}
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
    <List onSearchTextChange={setSearchText} isLoading={isLoading.some((e) => e)} throttle={false}>
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
      ) : noHistory ? (
        <List.EmptyView
          title={searchText ? `No ${searchText} history found` : "No history found"}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Search in Browser" url={searchUrl} />
            </ActionPanel>
          }
        />
      ) : (
        entries
      )}
    </List>
  );
}
