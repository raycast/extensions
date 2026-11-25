import { Icon, LaunchProps, List } from "@raycast/api";
import { useSQL } from "@raycast/utils";
import { useState } from "react";
import { ErrorEmptyView } from "./components/error-view";
import { DownloadListItem } from "./list";
import { getDownloadQuery } from "./sql";
import { Download } from "./types";
import { defaultHistoryDatabasePath } from "./history";

function SearchDownloads(props: LaunchProps) {
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const escapedSearchText = searchText.replace(/\\/g, "\\\\").replace(/'/g, "''").replace(/[%_]/g, "\\$&");
  const { data, isLoading, permissionView, error, revalidate } = useSQL<Download>(
    defaultHistoryDatabasePath,
    getDownloadQuery(escapedSearchText),
  );

  if (permissionView) {
    return permissionView;
  }

  return (
    <List
      searchBarPlaceholder="Search downloads"
      searchText={searchText}
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
    >
      {error ? (
        <ErrorEmptyView title="Could not read Cra downloads" error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Nothing found ¯\_(ツ)_/¯" />
      )}
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
  return <SearchDownloads {...props} />;
}
