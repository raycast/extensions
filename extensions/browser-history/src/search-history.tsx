import { ActionPanel, getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { useState, ReactElement } from "react";
import { ListEntries } from "./components";
import { Preferences, SupportedBrowsers } from "./interfaces";
import { ActionOpenPreferences, PermissionErrorDetail } from "./components/actions";
import { isPermissionError } from "./util";

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
    preferences.enableVivaldi;
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, error, entriesChrome, entriesFirefox, entriesSafari, entriesEdge, entriesBrave, entriesVivaldi } =
    useHistorySearch(searchText);

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

  let entries = [
    { name: "Chrome", entries: entriesChrome },
    { name: "Firefox", entries: entriesFirefox },
    { name: "Safari", entries: entriesSafari },
    { name: "Edge", entries: entriesEdge },
    { name: "Brave", entries: entriesBrave },
    { name: "Vivaldi", entries: entriesVivaldi },
  ].map((entry) => (
    <List.Section title={entry.name} key={entry.name}>
      {entry.entries?.map((e) => (
        <ListEntries.HistoryEntry entry={e} key={e.id} />
      ))}
    </List.Section>
  ));

  entries = arrangeEntries(entries, preferences.firstInResults);

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
