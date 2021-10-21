/**
 * RPC spec is available at https://trac.transmissionbt.com/browser/trunk/extras/rpc-spec.txt
 */

import { List, showToast, ToastStyle, Icon, ActionPanel, Color, getPreferenceValues } from "@raycast/api";
import { useState, useMemo, useCallback, useEffect } from "react";
import Transmission from "transmission-promise";
import { formatDistanceToNow } from "date-fns";
import prettyBytes from "pretty-bytes";
import { useInterval } from "./utils/hooks";
import { capitalize, truncate, padStart } from "./utils/string";
import { createClient } from "./modules/client";

enum TorrentStatus {
  Stopped = 0,
  QueuedToCheckFiles = 1,
  CheckingFiles = 2,
  QueuedToDownload = 3,
  Downloading = 4,
  QueuedToSeed = 5,
  Seeding = 6,
}

const preferences = getPreferenceValues();

const statusToLabel = (status: TorrentStatus, percentDone: number) => {
  switch (status) {
    case TorrentStatus.Stopped:
      return percentDone === 1 ? "Completed" : "Stopped";
    case TorrentStatus.QueuedToCheckFiles:
      return "Queued to check files";
    case TorrentStatus.CheckingFiles:
      return "Checking files";
    case TorrentStatus.QueuedToDownload:
      return "Queued to download";
    case TorrentStatus.Downloading:
      return "Downloading";
    case TorrentStatus.QueuedToSeed:
      return "Queued to seed";
    case TorrentStatus.Seeding:
      return "Seeding";
  }
};

const statusIconSource = (status: TorrentStatus, percentDone: number): string => {
  switch (status) {
    case TorrentStatus.Stopped:
      return "status-stopped.png";
    case TorrentStatus.QueuedToCheckFiles:
    case TorrentStatus.CheckingFiles:
    case TorrentStatus.QueuedToDownload:
      return Icon.Dot;
    case TorrentStatus.Downloading:
      switch (Math.round(percentDone * 10)) {
        case 0:
          return "status-progress-0.png";
        case 1:
          return "status-progress-1.png";
        case 2:
          return "status-progress-2.png";
        case 3:
          return "status-progress-3.png";
        case 4:
          return "status-progress-4.png";
        case 5:
          return "status-progress-5.png";
        case 6:
          return "status-progress-6.png";
        case 7:
          return "status-progress-7.png";
        case 8:
          return "status-progress-8.png";
        case 9:
          return "status-progress-9.png";
        case 10:
        default:
          return "status-progress-10.png";
      }
      break;
    case TorrentStatus.QueuedToSeed:
      return "Queued to seed";
    case TorrentStatus.Seeding:
      return "Seeding";
    default:
      return Icon.XmarkCircle;
  }
};

const formatEta = (eta: number): string => {
  console.log(eta);
  switch (eta) {
    case -1:
      return "Unavailable";
    case -2:
      return "Unknown";
    default:
      return `${capitalize(formatDistanceToNow(new Date(Date.now() + eta * 1000)))} Left`;
  }
};

const formatStatus = (torrent: Torrent): string => {
  return torrent.status === TorrentStatus.Downloading
    ? formatEta(torrent.eta)
    : statusToLabel(torrent.status, torrent.percentDone);
};

const statusIconColor = (status: TorrentStatus): string => {
  switch (status) {
    case TorrentStatus.Downloading:
      return Color.Green;
    default:
      return Color.SecondaryText;
  }
};

const sortTorrents = (t1: Torrent, t2: Torrent): number => {
  const direction = preferences.sortDirection === "asc" ? 1 : -1;
  switch (preferences.sortBy) {
    case "progress":
      return (t1.percentDone - t2.percentDone) * direction;
    case "name":
      return t1.fileName.localeCompare(t2.fileName) * direction;
    case "status":
      return (t2.status - t1.status) * direction;
    default:
      return 0;
  }
};

export default function TorrentList() {
  const transmission = useMemo(() => createClient(), []);
  const [torrents, setTorrents] = useState<Torrent[]>([]);

  const updateTorrents = useCallback(async () => {
    const torrents = await fetchTorrents(transmission);
    setTorrents(torrents);
  }, [transmission]);

  useEffect(() => {
    updateTorrents();
  }, []);
  useInterval(() => {
    updateTorrents();
  }, 5000);

  return (
    <List isLoading={torrents.length === 0} searchBarPlaceholder="Filter torrents by name...">
      {torrents.sort(sortTorrents).map((torrent) => (
        <TorrentListItem
          key={torrent.id}
          torrent={torrent}
          onStop={async (torrent) => {
            await transmission.stop([torrent.id]);
            await updateTorrents();
            showToast(ToastStyle.Success, `Torrent ${torrent.fileName} stopped`);
          }}
          onStart={async (torrent) => {
            await transmission.start([torrent.id]);
            await updateTorrents();
            showToast(ToastStyle.Success, `Torrent ${torrent.fileName} started`);
          }}
          onRemove={async (torrent, deleteLocalData) => {
            await transmission.remove([torrent.id], deleteLocalData);
            await updateTorrents();
            showToast(ToastStyle.Success, `Torrent ${torrent.fileName} deleted`);
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
}: {
  torrent: Torrent;
  onStop: (torrent: Torrent) => Promise<void>;
  onStart: (torrent: Torrent) => Promise<void>;
  onRemove: (torrent: Torrent, deleteLocalData: boolean) => Promise<void>;
}) {
  return (
    <List.Item
      id={String(torrent.id)}
      key={torrent.id}
      title={truncate(torrent.fileName, 60)}
      icon={{
        source: statusIconSource(torrent.status, torrent.percentDone),
        tintColor: statusIconColor(torrent.status),
      }}
      accessoryTitle={[
        `⬇️ ${padStart(prettyBytes(torrent.rateDownload), 4)}/s`,
        " - ",
        `⬆️ ${padStart(prettyBytes(torrent.rateUpload), 4)}/s`,
        " - ",
        `${padStart(Math.round(torrent.percentDone * 100), 3)}%`,
      ].join(" ")}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={`ETA: ${formatStatus(torrent)}`}>
            <ActionPanel.Item
              title={torrent.status === TorrentStatus.Stopped ? "Start Torrent" : "Stop Torrent"}
              onAction={() => (torrent.status === TorrentStatus.Stopped ? onStart(torrent) : onStop(torrent))}
            />
            <ActionPanel.Submenu title="Remove Torrent">
              <ActionPanel.Item title="Preserve Local Data" onAction={() => onRemove(torrent, false)} />
              <ActionPanel.Item title="Delete Local Data" onAction={() => onRemove(torrent, true)} />
            </ActionPanel.Submenu>
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function fetchTorrents(transmission: Transmission): Promise<Torrent[]> {
  try {
    const response = await transmission.get(false);
    return response.torrents.map((torrent: Torrent) => ({
      ...torrent,
      fileName: torrent.torrentFile.split("/").slice(-1)[0].split(".").slice(0, -2).join("."),
    }));
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Could not load torrents");
    return Promise.resolve([]);
  }
}

type Torrent = {
  id: number;
  torrentFile: string;
  fileName: string;
  comment: string;
  eta: number;
  percentDone: number;
  status: TorrentStatus;
  rateDownload: number;
  rateUpload: number;
};
