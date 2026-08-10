import { ActionPanel, Action, List, Icon, Color, showToast, Toast } from "@raycast/api";
import { Download } from "../types";
import { deleteDownload, deleteQueuedDownload } from "../api/downloads";
import { formatBytes, formatTypeLabel } from "../utils/formatters";
import { isVideoFile, openInPlayer } from "../utils/video";
import { copyDownloadLink } from "../utils/downloads";
import { VideoPlayers } from "../hooks/useVideoPlayers";
import { DownloadFiles } from "./DownloadFiles";

interface DownloadListItemProps {
  download: Download;
  apiKey: string;
  videoPlayers: VideoPlayers;
  onRefresh: () => void;
}

const isFailed = (state: string): boolean => state.toLowerCase().startsWith("failed");

const getStatus = (download: Download): { label: string; color: Color } => {
  if (download.isQueued) {
    return { label: "Queued", color: Color.Blue };
  }

  if (download.download_state && isFailed(download.download_state)) {
    return { label: "Failed", color: Color.Red };
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

export const DownloadListItem = ({ download, apiKey, videoPlayers, onRefresh }: DownloadListItemProps) => {
  const status = getStatus(download);
  const isDownloadReady = !download.isQueued && (download.download_finished || download.progress >= 1);
  const hasMultipleFiles = download.files.length > 1;
  const isSingleVideoFile =
    download.files.length === 1 && isVideoFile(download.files[0].short_name || download.files[0].name);
  const subtitle = formatSubtitle(download);
  const { players, setDefaultPlayer } = videoPlayers;

  return (
    <List.Item
      title={download.name}
      subtitle={subtitle}
      accessories={[{ tag: { value: status.label, color: status.color } }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {isDownloadReady &&
              isSingleVideoFile &&
              players.map((player) => (
                <Action
                  key={player.name}
                  title={`Open in ${player.name}`}
                  icon={Icon.Play}
                  onAction={() => openInPlayer(apiKey, download, player)}
                />
              ))}
            {isDownloadReady && (
              <Action title="Copy Download Link" icon={Icon.Link} onAction={() => copyDownloadLink(apiKey, download)} />
            )}
            {hasMultipleFiles && (
              <Action.Push
                title="View Files"
                icon={Icon.List}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                target={<DownloadFiles download={download} apiKey={apiKey} />}
              />
            )}
          </ActionPanel.Section>
          {isSingleVideoFile && players.length > 1 && (
            <ActionPanel.Section>
              <ActionPanel.Submenu title="Set Default Player" icon={Icon.Star}>
                {players.map((player) => (
                  <Action key={player.name} title={player.name} onAction={() => setDefaultPlayer(player)} />
                ))}
              </ActionPanel.Submenu>
            </ActionPanel.Section>
          )}
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
