import { ActionPanel, getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { useState, ReactElement } from "react";
import { ListEntries } from "./components";
import { Preferences, SupportedBrowsers } from "./interfaces";
import { ActionOpenPreferences, PermissionErrorDetail } from "./components/actions";
import { isPermissionError } from "./util";

export default function Command(): ReactElement {
  const preferences = getPreferenceValues<Preferences>();
  const enabled = preferences.enableChrome || preferences.enableFirefox || preferences.enableSafari;
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, error, entriesChrome, entriesFirefox, entriesSafari } = useHistorySearch(searchText);

  if (error) {
    if (isPermissionError(error)) {
      return <PermissionErrorDetail />;
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Cannot search history",
        message: error instanceof Error ? error.message : undefined,
      });
    }
  }

  const entries = [
    <List.Section title={"Chrome"} key={"chrome"}>
      {entriesChrome?.map((e) => (
        <ListEntries.HistoryEntry entry={e} key={e.id} />
      ))}
    </List.Section>,
    <List.Section title={"Firefox"} key={"firefox"}>
      {entriesFirefox?.map((e) => (
        <ListEntries.HistoryEntry entry={e} key={e.id} />
      ))}
    </List.Section>,
    <List.Section title={"Safari"} key={"safari"}>
      {entriesSafari?.map((e) => (
        <ListEntries.HistoryEntry entry={e} key={e.id} />
      ))}
    </List.Section>,
  ];

  if (preferences.firstInResults === SupportedBrowsers.Firefox) {
    const frontEntries = entries.splice(1, 1);
    entries.unshift(frontEntries[0]);
  }

  if (preferences.firstInResults === SupportedBrowsers.Safari) {
    const frontEntries = entries.splice(2, 1);
    entries.unshift(frontEntries[0]);
  }

  return (
    <List
      onSearchTextChange={function (query) {
        setSearchText(query);
      }}
      isLoading={isLoading}
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
