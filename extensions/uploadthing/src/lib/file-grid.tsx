import { Action, ActionPanel, Grid } from "@raycast/api";
import { UploadedFileData } from "uploadthing/types";
import { useFileWithSignedUrls } from "./hooks";

export const FileGrid = (props: { files: UploadedFileData[] }) => {
  const files = useFileWithSignedUrls(props.files);

  return (
    <Grid>
      {files.map((file) => (
        <Grid.Item
          key={file.key}
          content={file.url}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Browser" url={file.url} />
              <Action.CopyToClipboard title="Copy URL" content={file.url} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
};
