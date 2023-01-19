import { ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useState } from "react";
import { CopyLinkActionSection, OpenLinkActionSections } from "./actions";
import { databasePath, getQuery, useSQL } from "./sql";
import { HistoryEntry } from "./types";
import { getDomain, getLastVisitedAt } from "./utils";
import { isPermissionError, PermissionErrorView } from "./permissions";
import { VersionCheck } from "./version";

function SearchHistory() {
  const [searchText, setSearchText] = useState<string>();
  const { data, isLoading, error } = useSQL<HistoryEntry>(databasePath, getQuery(searchText));

  if (error) {
    if (isPermissionError(error)) {
      return <PermissionErrorView />;
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Cannot search history",
        message: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <List searchBarPlaceholder="Search history" isLoading={isLoading} onSearchTextChange={setSearchText}>
      <List.EmptyView icon={Icon.MagnifyingGlass} title="Nothing found ¯\_(ツ)_/¯" />
      {data?.map((entry) => (
        <List.Item
          key={entry.id}
          icon={getFavicon(entry.url)}
          title={entry.title}
          subtitle={getDomain(entry.url)}
          accessories={[getLastVisitedAt(entry)]}
          actions={
            <ActionPanel>
              <OpenLinkActionSections url={entry.url} />
              <CopyLinkActionSection url={entry.url} title={entry.title} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function Command() {
  return (
    <VersionCheck>
      <SearchHistory />
    </VersionCheck>
  );
}
