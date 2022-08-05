import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

import { QueryTypes, getFilesURL, File } from "./api/getFiles";
import FileListItem from "./components/FileListItem";

import { withGoogleAuth, getOAuthToken } from "./components/withGoogleAuth";

function SearchGoogleDriveFiles() {
  const [query, setQuery] = useState("");
  const [queryType, setQueryType] = useState<QueryTypes>(QueryTypes.fileName);
  const { data, isLoading, mutate } = useFetch<{ files: File[] }>(getFilesURL(queryType, query), {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getOAuthToken()}`,
    },
    onError(error) {
      console.error(error);
      showToast({ style: Toast.Style.Failure, title: "Failed to retrieve files" });
    },
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search files"
      searchBarAccessory={
        <List.Dropdown tooltip="Search mode" storeValue onChange={setQueryType as (value: string) => void}>
          <List.Dropdown.Item title="By file name at My Drive" value={QueryTypes.fileName} />
          <List.Dropdown.Item title="By file name at My Drive and Shared Drives" value={QueryTypes.fileNameAllDrives} />
          <List.Dropdown.Item title="By file name and full text at My Drive" value={QueryTypes.fullText} />
          <List.Dropdown.Item title="By file name and full text at My Drive and Shared Drives" value={QueryTypes.fullTextAllDrives} />
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
          {data.files?.map((file) => (
            <FileListItem file={file} key={file.id} mutate={mutate} />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

export default function Command() {
  return withGoogleAuth(<SearchGoogleDriveFiles />);
}
