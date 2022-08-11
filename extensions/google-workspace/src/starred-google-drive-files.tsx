import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import { getStarredFilesURL, File } from "./api/getFiles";
import FileListItem from "./components/FileListItem";
import { withGoogleAuth, getOAuthToken } from "./components/withGoogleAuth";

function StarredGoogleDriveFiles() {
  const { data, isLoading, mutate } = useFetch<{ files: File[] }>(getStarredFilesURL(), {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getOAuthToken()}`,
    },
    onError(error) {
      console.error(error);
      showToast({ style: Toast.Style.Failure, title: "Failed to retrieve starred files" });
    },
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter by file name">
      <List.EmptyView
        title="No starred files"
        description="You haven't starred any files yet"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Google Drive" icon="google-docs.png" url="https://drive.google.com" />
          </ActionPanel>
        }
      />

      {data?.files && data.files.length > 0 ? (
        <List.Section title="Starred Files" subtitle={`${data.files.length}`}>
          {data.files?.map((file) => (
            <FileListItem file={file} key={file.id} mutate={mutate} />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

export default function Command() {
  return withGoogleAuth(<StarredGoogleDriveFiles />);
}
