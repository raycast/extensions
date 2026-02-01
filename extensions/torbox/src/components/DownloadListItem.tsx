import { ActionPanel, Action, List, Icon, Color, showToast, Toast, Clipboard } from "@raycast/api";
import { Download } from "../types";
import { getDownloadLink, deleteDownload, deleteQueuedDownload } from "../api/downloads";
import { formatBytes, formatTypeLabel } from "../utils/formatters";
import { DownloadFiles } from "./DownloadFiles";

interface DownloadListItemProps {
  download: Download;
  apiKey: string;
  onRefresh: () => void;
}

const getStatus = (download: Download): { label: string; color: Color } => {
  if (download.isQueued) {
    return { label: "Queued", color: Color.Blue };
  }

  if (download.download_finished || download.progress >= 1) {
    return { label: "Ready", color: Color.Green };
  }

  return { label: `${Math.round(download.progress * 100)}%`, color: Color.Orange };
};

const formatSubtitle = (download: Download): string => {
  const typeLabel = formatTypeLabel(download.type);

  if (download.isQueued) {
    return typeLabel;
  }

  const fileCount = download.files.length > 1 ? ` · ${download.files.length} files` : "";
  return `${formatBytes(download.size)} · ${typeLabel}${fileCount}`;
};

const copyDownloadLink = async (apiKey: string, download: Download) => {
  try {
    await showToast({ style: Toast.Style.Animated, title: "Getting download link..." });
    const link = await getDownloadLink(apiKey, download.type, download.id);
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

const handleDelete = async (apiKey: string, download: Download, onRefresh: () => void) => {
  try {
    await showToast({ style: Toast.Style.Animated, title: "Deleting download..." });

    if (download.isQueued) {
      await deleteQueuedDownload(apiKey, download.id);
    } else {
      await deleteDownload(apiKey, download.type, download.id);
    }

    await showToast({ style: Toast.Style.Success, title: "Download deleted" });
    onRefresh();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to delete download",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const DownloadListItem = ({ download, apiKey, onRefresh }: DownloadListItemProps) => {
  const status = getStatus(download);
  const isReady = !download.isQueued && (download.download_finished || download.progress >= 1);
  const hasMultipleFiles = download.files.length > 1;
  const subtitle = formatSubtitle(download);

  return (
    <List.Item
      title={download.name}
      subtitle={subtitle}
      accessories={[{ tag: { value: status.label, color: status.color } }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {isReady && <Action title="Copy Download Link" onAction={() => copyDownloadLink(apiKey, download)} />}
            {hasMultipleFiles && (
              <Action.Push
                title="View Files"
                icon={Icon.List}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                target={<DownloadFiles download={download} apiKey={apiKey} />}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action title="Refresh All Downloads" shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={onRefresh} />
            <Action
              title="Delete Download"
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={() => handleDelete(apiKey, download, onRefresh)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
