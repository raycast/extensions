import { Action, ActionPanel, Grid } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { listAllFiles } from "./api/getFiles";
import { getUserEmail } from "./api/googleAuth";
import { FileGridItem } from "./components/FileGridItem";
import { withGoogleAuth } from "./components/withGoogleAuth";

function SearchGoogleDriveFiles() {
  const [query, setQuery] = useState("");
  const email = getUserEmail();

  const { data, isLoading } = useCachedPromise(async () => await listAllFiles(), [], {
    failureToastOptions: { title: "Failed to retrieve files" },
  });

  const folders =
    data?.files.filter(
      (file) =>
        file.mimeType === "application/vnd.google-apps.folder" && file.name.toLowerCase().includes(query.toLowerCase()),
    ) || [];

  const files =
    data?.files.filter(
      (file) =>
        file.mimeType !== "application/vnd.google-apps.folder" && file.name.toLowerCase().includes(query.toLowerCase()),
    ) || [];

  return (
    <Grid
      columns={10}
      inset={Grid.Inset.Zero}
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Browse and search files and folders"
      navigationTitle="Google Drive Files"
    >
      <Grid.EmptyView
        title="No files"
        description="Your Google Drive is empty"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Google Drive" url="https://drive.google.com" />
          </ActionPanel>
        }
      />

      {folders.length > 0 && (
        <Grid.Section title="Folders" subtitle={`${folders.length}`}>
          {folders.map((file) => (
            <FileGridItem key={file.id} file={file} email={email} />
          ))}
        </Grid.Section>
      )}

      {files.length > 0 && (
        <Grid.Section title="Files" subtitle={`${files.length}`}>
          {files.map((file) => (
            <FileGridItem key={file.id} file={file} email={email} />
          ))}
        </Grid.Section>
      )}
    </Grid>
  );
}

export default withGoogleAuth(SearchGoogleDriveFiles);
