import { Action, ActionPanel, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useState } from "react";

import { QueryTypes, getFiles, ScopeTypes } from "./api/getFiles";
import FileListItem from "./components/FileListItem";

import { withGoogleAuth } from "./components/withGoogleAuth";
import { getUserEmail } from "./api/googleAuth";

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
      searchBarPlaceholder="Search files"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Search mode"
          value={`${queryType}-${scopeType}`}
          onChange={(value) => {
            const [queryType, scopeType] = value.split("-");
            setQueryType(queryType as QueryTypes);
            setScopeType(scopeType as ScopeTypes);
          }}
        >
          <List.Dropdown.Item title="By file name in My Drive" value={`${QueryTypes.fileName}-${ScopeTypes.user}`} />
          <List.Dropdown.Item
            title="By file name in All Drives"
            value={`${QueryTypes.fileName}-${ScopeTypes.allDrives}`}
          />
          <List.Dropdown.Item title="In full text in My Drive" value={`${QueryTypes.fullText}-${ScopeTypes.user}`} />
          <List.Dropdown.Item
            title="In full text in All Drives"
            value={`${QueryTypes.fullText}-${ScopeTypes.allDrives}`}
          />
        </List.Dropdown>
      }
      onSearchTextChange={setQuery}
      throttle
    >
      <List.EmptyView
        title="No files"
        description="You haven't any files yet"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Open Google Drive"
              icon="google-drive.png"
              url="https://docs.google.com/document/create"
            />
          </ActionPanel>
        }
      />

      {data?.files && data.files.length > 0 ? (
        <List.Section title="Recent Files" subtitle={`${data.files.length}`}>
          {data.files?.map((file) => <FileListItem file={file} key={file.id} email={email} />)}
        </List.Section>
      ) : null}
    </List>
  );
}

export default withGoogleAuth(SearchGoogleDriveFiles);
