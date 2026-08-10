import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { Download } from "../types";
import { formatBytes } from "../utils/formatters";
import { isVideoFile } from "../utils/video";
import { openInPlayer } from "../utils/video";
import { copyDownloadLink } from "../utils/downloads";
import { useVideoPlayers } from "../hooks/useVideoPlayers";

interface DownloadFilesProps {
  download: Download;
  apiKey: string;
}

export const DownloadFiles = ({ download, apiKey }: DownloadFilesProps) => {
  const isDownloadReady = download.download_finished || download.progress >= 1;
  const { players, setDefaultPlayer } = useVideoPlayers();

  return (
    <List navigationTitle={download.name} searchBarPlaceholder="Search files...">
      <List.Section title="Files" subtitle={`${download.files.length}`}>
        {download.files.map((file) => {
          const filename = file.short_name || file.name;
          const isVideo = isVideoFile(filename);
          return (
            <List.Item
              key={file.id}
              title={filename}
              subtitle={formatBytes(file.size)}
              actions={
                <ActionPanel>
                  {isDownloadReady &&
                    isVideo &&
                    players.map((player) => (
                      <Action
                        key={player.name}
                        title={`Open in ${player.name}`}
                        icon={Icon.Play}
                        onAction={() => openInPlayer(apiKey, download, player, file.id)}
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
        })}
      </List.Section>
    </List>
  );
};
