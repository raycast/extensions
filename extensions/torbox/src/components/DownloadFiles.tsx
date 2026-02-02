import { ActionPanel, Action, List, showToast, Toast, Clipboard } from "@raycast/api";
import { Download } from "../types";
import { getDownloadLink } from "../api/downloads";
import { formatBytes } from "../utils/formatters";

interface DownloadFilesProps {
  download: Download;
  apiKey: string;
}

const copyFileDownloadLink = async (apiKey: string, download: Download, fileId: number) => {
  try {
    await showToast({ style: Toast.Style.Animated, title: "Getting download link..." });
    const link = await getDownloadLink(apiKey, download.type, download.id, fileId);
    await Clipboard.copy(link);
    await showToast({ style: Toast.Style.Success, title: "Download link copied!" });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to get download link",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const DownloadFiles = ({ download, apiKey }: DownloadFilesProps) => {
  const isReady = download.download_finished || download.progress >= 1;

  return (
    <List navigationTitle={download.name} searchBarPlaceholder="Search files...">
      <List.Section title="Files" subtitle={`${download.files.length}`}>
        {download.files.map((file) => (
          <List.Item
            key={file.id}
            title={file.short_name || file.name}
            subtitle={formatBytes(file.size)}
            actions={
              <ActionPanel>
                {isReady && (
                  <Action title="Copy Download Link" onAction={() => copyFileDownloadLink(apiKey, download, file.id)} />
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
};
