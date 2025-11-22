import { useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getFavicon, useCachedState } from "@raycast/utils";
import { DEFAULT_DIA_PROFILE_ID, DIA_PROFILE_KEY, NO_HISTORY_MESSAGE } from "./constants";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { HistoryEntry } from "./interfaces";
import DiaProfileDropdown from "./components/DiaProfileDropdown";

function HistoryActions({ entry }: { entry: HistoryEntry }) {
  return (
    <ActionPanel>
      <Action.Open title="Open in Dia" target={entry.url} application="Dia" />
      <Action.OpenInBrowser url={entry.url} />
      <Action.CopyToClipboard title="Copy URL" content={entry.url} />
      <Action.CopyToClipboard title="Copy Title" content={entry.title} />
    </ActionPanel>
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState<string>();
  const [profile] = useCachedState<string>(DIA_PROFILE_KEY, DEFAULT_DIA_PROFILE_ID);
  const { data, isLoading, error, permissionView } = useHistorySearch(profile, searchText);

  if (permissionView) {
    return permissionView;
  }

  const isNoHistory = error === NO_HISTORY_MESSAGE;
  const emptyTitle = error && !isNoHistory ? "Unable to load history" : "No history found";
  const emptyDescription = error ?? "Pages you've viewed in Dia will show up here.";

  return (
    <List
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle
      searchBarPlaceholder="Search history"
      searchBarAccessory={<DiaProfileDropdown />}
    >
      {data?.map((entry) => (
        <List.Item
          key={`${entry.id}-${entry.lastVisited.getTime()}`}
          title={entry.title || entry.url}
          subtitle={entry.url}
          icon={getFavicon(entry.url)}
          accessories={entry.lastVisited ? [{ date: entry.lastVisited, tooltip: "Last visited" }] : []}
          actions={<HistoryActions entry={entry} />}
        />
      ))}

      {!isLoading && (data?.length || 0) === 0 ? (
        <List.EmptyView icon={error ? Icon.Warning : Icon.Clock} title={emptyTitle} description={emptyDescription} />
      ) : null}
    </List>
  );
}
