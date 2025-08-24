/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * RPC spec is available at https://trac.transmissionbt.com/browser/trunk/extras/rpc-spec.txt
 */

import { List, showToast, Toast } from "@raycast/api";
import { useState, useMemo, useEffect } from "react";
import { $enum } from "ts-enum-util";
import prettyBytes from "pretty-bytes";
import { usePersistentState } from "raycast-toolkit";
import { padList } from "./utils/list";
import { useAllTorrents, useMutateTorrent, useSessionStats } from "./modules/client";
import { TorrentStatus, Torrent } from "./types";
import TorrentListItem from "./components/TorrentListItem";
import { preferences } from "./utils/preferences";

const TorrentStatusLabel: Record<string, string> = {
  Stopped: "Stopped",
  QueuedToCheckFiles: "Queued to check files",
  CheckingFiles: "Checking files",
  QueuedToDownload: "Queued to download",
  Downloading: "Downloading",
  QueuedToSeed: "Queued to seed",
  Seeding: "Seeding",
};

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
    [sortedTorrents, didLoad, search, statusFilter],
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
    [filteredTorrents],
  );
  const paddedRateUploads = useMemo(
    () => padList(filteredTorrents.map((t) => `${prettyBytes(t.rateUpload)}/s`)),
    [filteredTorrents],
  );
  const paddedPercentDones = useMemo(
    () => padList(filteredTorrents.map((t) => `${Math.round(t.percentDone * 100)}%`)),
    [filteredTorrents],
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
            onRemove={async (torrent, deleteLocalData) => {
              try {
                if (deleteLocalData) {
                  await mutateTorrent.removeAndDeleteLocalData(torrent.id);
                } else {
                  await mutateTorrent.remove(torrent.id);
                }
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
