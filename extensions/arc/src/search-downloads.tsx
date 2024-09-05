import { Icon, LaunchProps, List } from "@raycast/api";
import { useSQL } from "@raycast/utils";
import { useState } from "react";
import { DownloadListItem } from "./list";
import { getDownloadQuery, historyDatabasePath } from "./sql";
import { Download } from "./types";
import { VersionCheck } from "./version";

function SearchDownloads(props: LaunchProps) {
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const escapedSearchText = searchText.replace(/"/g, '""');
  const { data, isLoading, permissionView } = useSQL<Download>(
    historyDatabasePath,
    getDownloadQuery(escapedSearchText),
  );

  if (permissionView) {
    return permissionView;
  }

  return (
    <List
      searchBarPlaceholder="Search download"
      searchText={searchText}
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
    >
      <List.EmptyView icon={Icon.MagnifyingGlass} title="Nothing found ¯\_(ツ)_/¯" />
      <List.Section
        title="Downloads"
        subtitle={data ? `${data.length} ${data.length === 1 ? "entry" : "entries"}` : undefined}
      >
        {data?.map((download: Download) => <DownloadListItem key={download.id} download={download} />)}
      </List.Section>
    </List>
  );
}

export default function Command(props: LaunchProps) {
  return (
    <VersionCheck>
      <SearchDownloads {...props} />
    </VersionCheck>
  );
}
