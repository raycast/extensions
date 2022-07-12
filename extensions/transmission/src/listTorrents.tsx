/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * RPC spec is available at https://trac.transmissionbt.com/browser/trunk/extras/rpc-spec.txt
 */

import {
  List,
  showToast,
  Toast,
  ActionPanel,
  Action,
  getPreferenceValues,
  useNavigation,
  Icon,
  Color,
  Keyboard,
} from "@raycast/api";
import { useState, useMemo, useEffect } from "react";
import { $enum } from "ts-enum-util";
import prettyBytes from "pretty-bytes";
import { usePersistentState } from "raycast-toolkit";
import { truncate } from "./utils/string";
import { padList } from "./utils/list";
import { useAllTorrents, useMutateTorrent, useSessionStats } from "./modules/client";
import { renderDetails } from "./utils/renderDetails";
import { useAsync } from "react-use";
import { type SessionStats, TorrentStatus, type Torrent } from "./types";
import { formatStatus, statusIcon } from "./utils/status";
import { TorrentConfiguration } from "./components/TorrentConfiguration";
import path from "path";
import { existsSync } from "fs";

const pauseIcon = { source: "status-stopped.png", tintColor: Color.SecondaryText };

const TorrentStatusLabel: Record<string, string> = {
  Stopped: "Stopped",
  QueuedToCheckFiles: "Queued to check files",
  CheckingFiles: "Checking files",
  QueuedToDownload: "Queued to download",
  Downloading: "Downloading",
  QueuedToSeed: "Queued to seed",
  Seeding: "Seeding",
};

const preferences = getPreferenceValues();

const sortTorrents = (t1: Torrent, t2: Torrent): number => {
  const direction = preferences.sortDirection === "asc" ? 1 : -1;
  switch (preferences.sortBy) {
    case "progress":
      return (t1.percentDone - t2.percentDone) * direction;
    case "name":
      return t1.name.localeCompare(t2.name) * direction;
    case "status":
      return (t2.status - t1.status) * direction;
    case "addedDate":
      return (t2.addedDate - t1.addedDate) * direction;
    default:
      return 0;
  }
};

type TorrentStatusFilterType = keyof typeof TorrentStatus | "All";
let useStatusFilter: () => [TorrentStatusFilterType, (status: TorrentStatusFilterType) => void, boolean];

if (preferences.rememberStatusFilter) {
  useStatusFilter = () => usePersistentState<keyof typeof TorrentStatus | "All">("statusFilter", "All");
} else {
  useStatusFilter = () => {
    const [state, setState] = useState<TorrentStatusFilterType>("All");
    return [state, setState, false];
  };
}

export default function TorrentList() {
  const [search, setSearch] = useState("");
  const { data: torrents, error: torrentsError } = useAllTorrents();
  const { data: sessionStats } = useSessionStats();
  const mutateTorrent = useMutateTorrent();

  const didLoad = torrents != null && sessionStats != null;

  const [statusFilter, setStatusFilter, loadingStatusFilter] = useStatusFilter();
  const sortedTorrents = useMemo(() => torrents?.sort(sortTorrents) ?? [], [torrents]);
  const filteredTorrents = useMemo(
    () =>
      didLoad
        ? sortedTorrents
            // status filter
            .filter((x) => (statusFilter === "All" ? true : x.status === TorrentStatus[statusFilter]))
            // fuzzy search
            .filter((x) => x.name.toLowerCase().includes(search.toLowerCase()))
        : [],
    [sortedTorrents, didLoad, search, statusFilter]
  );

  const [isShowingDetail, setIsShowingDetail] = useState(false);
  useEffect(() => {
    if (filteredTorrents.length > 0) return;
    setIsShowingDetail(false);
  }, [filteredTorrents.length]);

  useEffect(() => {
    if (torrentsError == null) return;

    console.error(torrentsError);
    showToast(Toast.Style.Failure, `Could not load torrents: ${torrentsError.code}`);
  }, [torrentsError]);

  const paddedRateDownloads = useMemo(
    () => padList(filteredTorrents.map((t) => `${prettyBytes(t.rateDownload)}/s`)),
    [filteredTorrents]
  );
  const paddedRateUploads = useMemo(
    () => padList(filteredTorrents.map((t) => `${prettyBytes(t.rateUpload)}/s`)),
    [filteredTorrents]
  );
  const paddedPercentDones = useMemo(
    () => padList(filteredTorrents.map((t) => `${Math.round(t.percentDone * 100)}%`)),
    [filteredTorrents]
  );

  return (
    <List
      isShowingDetail={isShowingDetail}
      isLoading={!didLoad || loadingStatusFilter}
      searchBarPlaceholder="Filter torrents by name..."
      onSearchTextChange={setSearch}
      searchBarAccessory={
        <List.Dropdown
          value={statusFilter}
          tooltip="Filter by status"
          onChange={(status) => setStatusFilter(status as keyof typeof TorrentStatus)}
        >
          <List.Dropdown.Item title="All" value="All" />
          {$enum(TorrentStatus).map((value) => {
            const status = TorrentStatus[value];
            return <List.Dropdown.Item key={status} title={TorrentStatusLabel[status]} value={status} />;
          })}
        </List.Dropdown>
      }
    >
      {didLoad &&
        filteredTorrents.map((torrent, index) => (
          <TorrentListItem
            key={torrent.id}
            torrent={torrent}
            rateDownload={paddedRateDownloads[index]}
            rateUpload={paddedRateUploads[index]}
            percentDone={paddedPercentDones[index]}
            sessionStats={sessionStats}
            isShowingDetail={isShowingDetail}
            onToggleDetail={() => setIsShowingDetail((value) => !value)}
            onStop={async (torrent) => {
              try {
                await mutateTorrent.stop(torrent.id);
              } catch (error: any) {
                console.error(error);
                showToast(Toast.Style.Failure, `Could not stop torrent: ${torrent.name}`);
                return;
              }
              showToast(Toast.Style.Success, `Torrent ${torrent.name} paused`);
            }}
            onStart={async (torrent) => {
              try {
                await mutateTorrent.start(torrent.id);
              } catch (error: any) {
                console.error(error);
                showToast(Toast.Style.Failure, `Could not start torrent: ${torrent.name}`);
                return;
              }
              showToast(Toast.Style.Success, `Torrent ${torrent.name} resumed`);
            }}
            onRemove={async (torrent) => {
              try {
                await mutateTorrent.remove(torrent.id);
              } catch (error: any) {
                console.error(error);
                showToast(Toast.Style.Failure, `Could not start torrent: ${torrent.name}`);
                return;
              }
              showToast(Toast.Style.Success, `Torrent ${torrent.name} deleted`);
            }}
            onStartAll={async () => {
              await mutateTorrent.startAll();

              showToast(Toast.Style.Success, `All torrents resumed`);
            }}
            onStopAll={async () => {
              await mutateTorrent.stopAll();

              showToast(Toast.Style.Success, `All torrents paused`);
            }}
          />
        ))}
    </List>
  );
}

function TorrentListItem({
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
  onRemove: (torrent: Torrent) => Promise<void>;
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
    [rateDownload, rateUpload, percentDone]
  );

  const details = useAsync(
    () =>
      renderDetails(
        torrent,
        downloadStats.map(({ textIcon, text }) => [textIcon, text.trim()].join(" ").trim()).join(" - ")
      ),
    [torrent, downloadStats]
  );

  const files = torrent.files.filter((file) => existsSync(path.join(torrent.downloadDir, file.name)));

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
            markdown={details.value ?? `\`\`\`\n${details.error}\n\`\`\``}
            isLoading={details.loading}
          />
        )
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title={`Selected Torrent (${selectedTorrentTitle})`}>
            <Action
              icon={Icon.Binoculars}
              title={isShowingDetail ? "Hide details" : "Show details"}
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
                onAction={() => onRemove(torrent)}
              />
            </ActionPanel.Submenu>
            <Action.Open
              title="Open Download Folder"
              shortcut={{ key: "d", modifiers: ["cmd"] }}
              target={torrent.downloadDir}
            />
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
              shortcut={{ key: ",", modifiers: ["cmd"] }}
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
