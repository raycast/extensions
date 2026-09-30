import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { Download } from "../types";
import { formatBytes } from "../utils/formatters";
import { copyDownloadLink } from "../utils/downloads";
import { isVideoFile, openInPlayer } from "../utils/video";
import { RecentDownload } from "../hooks/useRecentDownloads";
import { VideoPlayers } from "../hooks/useVideoPlayers";
import { DownloadFiles } from "./DownloadFiles";

interface RecentDownloadListItemProps {
  recent: RecentDownload;
  download: Download;
  apiKey: string;
  videoPlayers: VideoPlayers;
  onOpen: (recent: RecentDownload) => void;
}

export const RecentDownloadListItem = ({
  recent,
  download,
  apiKey,
  videoPlayers,
  onOpen,
}: RecentDownloadListItemProps) => {
  const { push } = useNavigation();
  const isDownloadReady = !download.isQueued && (download.download_finished || download.progress >= 1);
  const { players, setDefaultPlayer } = videoPlayers;

  if (recent.fileId === undefined) {
    return (
      <List.Item
        title={download.name}
        subtitle={`${download.files.length} ${download.files.length === 1 ? "file" : "files"}`}
        icon={Icon.Folder}
        actions={
          <ActionPanel>
            <Action
              title="View Files"
              icon={Icon.List}
              onAction={() => {
                onOpen(recent);
                push(<DownloadFiles download={download} apiKey={apiKey} onOpen={onOpen} />);
              }}
            />
            {isDownloadReady && (
              <Action title="Copy Download Link" icon={Icon.Link} onAction={() => copyDownloadLink(apiKey, download)} />
            )}
          </ActionPanel>
        }
      />
    );
  }

  const file = download.files.find((downloadFile) => downloadFile.id === recent.fileId);
  if (!file) return null;

  const filename = file.short_name || file.name;
  const isVideo = isVideoFile(filename);

  return (
    <List.Item
      title={filename}
      subtitle={`${download.name} · ${formatBytes(file.size)}`}
      icon={Icon.Document}
      actions={
        <ActionPanel>
          {isDownloadReady &&
            isVideo &&
            players.map((player) => (
              <Action
                key={player.name}
                title={`Open in ${player.name}`}
                icon={Icon.Play}
                onAction={() => openInPlayer(apiKey, download, player, file.id, () => onOpen(recent))}
              />
            ))}
          {isDownloadReady && (
            <Action
              title="Copy Download Link"
              icon={Icon.Link}
              onAction={() => copyDownloadLink(apiKey, download, file.id)}
            />
          )}
          {isVideo && players.length > 1 && (
            <ActionPanel.Section>
              <ActionPanel.Submenu title="Set Default Player" icon={Icon.Star}>
                {players.map((player) => (
                  <Action key={player.name} title={player.name} onAction={() => setDefaultPlayer(player)} />
                ))}
              </ActionPanel.Submenu>
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
};
