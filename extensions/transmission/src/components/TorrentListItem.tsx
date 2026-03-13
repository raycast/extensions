import {
  List,
  ActionPanel,
  Action,
  useNavigation,
  Icon,
  Keyboard,
  Detail,
  Color,
  getPreferenceValues,
} from "@raycast/api";
import dedent from "dedent-js";
import { useMemo } from "react";
import prettyBytes from "pretty-bytes";
import { truncate } from "../utils/string";
import { isLocalTransmission } from "../modules/client";
import { renderPieces } from "../utils/renderCells";
import { useAsync } from "react-use";
import { SessionStats, TorrentStatus, Torrent } from "../types";
import { formatStatus, statusIcon } from "../utils/status";
import { TorrentConfiguration } from "./TorrentConfiguration";
import path from "path";
import { existsSync } from "fs";
import FileList from "./FileList";
import TorrentInfo from "./TorrentInfo";
import TrackerList from "./TrackerList";
import { getMaxFilesShown } from "../utils/preferences";

const pauseIcon = { source: "status-stopped.png", tintColor: Color.SecondaryText };
const preferences = getPreferenceValues();

export default function TorrentListItem({
  torrent,
  onStop,
  onStart,
  onRemove,
  onStartAll,
  onStopAll,
  onToggleDetail,
  isShowingDetail,
  rateDownload,
  rateUpload,
  percentDone,
  sessionStats,
}: {
  torrent: Torrent;
  onStop: (torrent: Torrent) => Promise<void>;
  onStart: (torrent: Torrent) => Promise<void>;
  onStartAll: (torrent: Torrent) => Promise<void>;
  onStopAll: (torrent: Torrent) => Promise<void>;
  onRemove: (torrent: Torrent, deleteLocalData?: boolean) => Promise<void>;
  onToggleDetail: () => void;
  isShowingDetail: boolean;
  rateDownload: string;
  rateUpload: string;
  percentDone: string;
  sessionStats: SessionStats | null;
}) {
  const { push } = useNavigation();
  const totalRateDownload = sessionStats != null ? `${prettyBytes(sessionStats.downloadSpeed)}/s` : "N/A";
  const totalRateUpload = sessionStats != null ? `${prettyBytes(sessionStats.uploadSpeed)}/s` : "N/A";

  const selectedTorrentTitle = [
    `ETA: ${formatStatus(torrent)}`,
    torrent.metadataPercentComplete < 1 ? `${torrent.metadataPercentComplete * 100}% metadata` : null,
  ]
    .filter(Boolean)
    .join(" - ");

  const downloadStats = useMemo(
    () => [
      { icon: Icon.ChevronDown, textIcon: "↓", text: rateDownload },
      { icon: Icon.ChevronUp, textIcon: "↑", text: rateUpload },
      { text: percentDone },
    ],
    [rateDownload, rateUpload, percentDone],
  );

  const files = useMemo(
    () =>
      isLocalTransmission()
        ? torrent.files
            .filter((file) => existsSync(path.join(torrent.downloadDir, file.name)))
            .slice(0, getMaxFilesShown())
        : [],
    [torrent],
  );

  const cellImage = useAsync(
    () => renderPieces({ pieces: torrent.pieces, complete: torrent.percentDone === 1 }),
    [torrent],
  );

  return (
    <List.Item
      id={String(torrent.id)}
      key={torrent.id}
      title={truncate(torrent.name, 60)}
      icon={statusIcon(torrent)}
      accessories={!isShowingDetail ? downloadStats.map(({ text, icon }) => ({ text, icon })) : undefined}
      detail={
        isShowingDetail && (
          <List.Item.Detail
            isLoading={cellImage.loading}
            markdown={dedent(`
                  # ${downloadStats.map(({ textIcon, text }) => [textIcon, text.trim()].join(" ").trim()).join(" - ")}

                  ${cellImage.value ? `<img src="data:image/svg+xml,${encodeURIComponent(cellImage.value)}"/>` : ""}
                  ${torrent.errorString ? `**Error**: ${torrent.errorString}` : ""}
                `)}
            metadata={
              <Detail.Metadata>
                {preferences.showFilesAboveTorrentInfo ? (
                  <>
                    <FileList torrent={torrent} />
                    <Detail.Metadata.Separator />
                    <TorrentInfo torrent={torrent} />
                  </>
                ) : (
                  <>
                    <TorrentInfo torrent={torrent} />
                    <Detail.Metadata.Separator />
                    <FileList torrent={torrent} />
                  </>
                )}
                <Detail.Metadata.Separator />
                <TrackerList torrent={torrent} />
              </Detail.Metadata>
            }
          />
        )
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title={`Selected Torrent (${selectedTorrentTitle})`}>
            <Action
              icon={Icon.Binoculars}
              title={isShowingDetail ? "Hide Details" : "Show Details"}
              onAction={onToggleDetail}
            />
            <Action
              icon={torrent.status === TorrentStatus.Stopped ? Icon.ArrowClockwise : pauseIcon}
              title={torrent.status === TorrentStatus.Stopped ? "Resume Download" : "Pause Download"}
              onAction={() => (torrent.status === TorrentStatus.Stopped ? onStart(torrent) : onStop(torrent))}
            />
            <ActionPanel.Submenu
              title="Remove Torrent"
              icon={Icon.Trash}
              shortcut={{ key: "backspace", modifiers: ["cmd"] }}
            >
              <Action
                title="Preserve Local Data"
                shortcut={{ key: "backspace", modifiers: ["cmd"] }}
                onAction={() => onRemove(torrent)}
              />
              <Action
                title="Delete Local Data"
                shortcut={{ key: "backspace", modifiers: ["cmd", "shift"] }}
                onAction={() => onRemove(torrent, true)}
              />
            </ActionPanel.Submenu>
            {isLocalTransmission() ? (
              <Action.Open
                title="Open Download Folder"
                shortcut={{ key: "d", modifiers: ["cmd"] }}
                target={torrent.downloadDir}
              />
            ) : null}
            {files.length >= 1 ? (
              <ActionPanel.Submenu
                icon={Icon.Upload}
                title="Open Downloaded Files..."
                shortcut={{ key: "o", modifiers: ["cmd"] }}
              >
                {files.map((file, index) => (
                  <Action.OpenWith
                    key={index}
                    shortcut={
                      index < 10 ? { key: String(index + 1) as Keyboard.KeyEquivalent, modifiers: ["cmd"] } : undefined
                    }
                    title={file.name}
                    path={path.join(torrent.downloadDir, file.name)}
                  />
                ))}
              </ActionPanel.Submenu>
            ) : files.length === 1 ? (
              <Action.OpenWith
                icon={Icon.Upload}
                title={files[0].name}
                path={path.join(torrent.downloadDir, files[0].name)}
              />
            ) : null}
            <Action
              icon={Icon.Gear}
              title="Configuration"
              shortcut={{ key: "h", modifiers: ["cmd"] }}
              onAction={() => push(<TorrentConfiguration id={torrent.id} />)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title={`All Torrents (↓ ${totalRateDownload} - ↑ ${totalRateUpload})`}>
            <Action
              shortcut={{ key: "r", modifiers: ["cmd", "shift"] }}
              title="Resume All"
              icon={Icon.ArrowClockwise}
              onAction={() => onStartAll(torrent)}
            />
            <Action
              shortcut={{ key: "p", modifiers: ["cmd", "shift"] }}
              title="Pause All"
              icon={pauseIcon}
              onAction={() => onStopAll(torrent)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
