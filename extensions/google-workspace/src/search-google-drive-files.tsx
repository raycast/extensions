import { Action, ActionPanel, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useState } from "react";

import { getFiles, QueryTypes, ScopeTypes } from "./api/getFiles";
import FileListItem from "./components/FileListItem";

import { getUserEmail } from "./api/googleAuth";
import { withGoogleAuth } from "./components/withGoogleAuth";

function getSectionTitle(queryType: QueryTypes): string {
  if (queryType === QueryTypes.fullText) {
    return "Results";
  }
  return "Recently Used";
}

function SearchGoogleDriveFiles() {
  const [query, setQuery] = useState("");
  const [queryType, setQueryType] = useCachedState<QueryTypes>("query type", QueryTypes.fileName);
  const [scopeType, setScopeType] = useCachedState<ScopeTypes>("scope type", ScopeTypes.allDrives);

  const email = getUserEmail();

  const { data, isLoading } = useCachedPromise(
    async (queryType: QueryTypes, scopeType: ScopeTypes, query: string) =>
      await getFiles({ queryType, queryText: query, scope: scopeType }),
    [queryType, scopeType, query],
    { failureToastOptions: { title: "Failed to retrieve files" } },
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={true}
      searchBarPlaceholder="Search in Drive"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Search mode"
          placeholder="Filter by"
          value={`${queryType}-${scopeType}`}
          onChange={(value) => {
            const [queryType, scopeType] = value.split("-");
            setQueryType(queryType as QueryTypes);
            setScopeType(scopeType as ScopeTypes);
          }}
        >
          <List.Dropdown.Item title="File Name in My Drive" value={`${QueryTypes.fileName}-${ScopeTypes.user}`} />
          <List.Dropdown.Item
            title="File Name in All Drives"
            value={`${QueryTypes.fileName}-${ScopeTypes.allDrives}`}
          />
          <List.Dropdown.Item title="Content in My Drive" value={`${QueryTypes.fullText}-${ScopeTypes.user}`} />
          <List.Dropdown.Item title="Content in All Drives" value={`${QueryTypes.fullText}-${ScopeTypes.allDrives}`} />
          <List.Dropdown.Item title="Starred in My Drive" value={`${QueryTypes.starred}-${ScopeTypes.user}`} />
          <List.Dropdown.Item title="Starred in All Drives" value={`${QueryTypes.starred}-${ScopeTypes.allDrives}`} />
        </List.Dropdown>
      }
      onSearchTextChange={setQuery}
      throttle
    >
      <List.EmptyView
        title="No files found"
        description="Try adjusting your search or filter"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Google Drive" icon="google-drive.png" url="https://drive.google.com" />
          </ActionPanel>
        }
      />

      {data?.files && data.files.length > 0 && (
        <List.Section title={getSectionTitle(queryType)} subtitle={`${data.files.length}`}>
          {data.files.map((file) => (
            <FileListItem file={file} key={file.id} email={email} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default withGoogleAuth(SearchGoogleDriveFiles);
