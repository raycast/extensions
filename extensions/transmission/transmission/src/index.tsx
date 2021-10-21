import { List, showToast, ToastStyle, Icon, ActionPanel } from "@raycast/api";
import { useState, useMemo, useCallback, useEffect } from "react";
import Transmission from "transmission-promise";
import { formatDistanceToNow } from "date-fns";
import { useInterval } from "./utils/useInterval";

enum TorrentStatus {
  Stopped = 0,
  QueuedToCheckFiles = 1,
  CheckingFiles = 2,
  QueuedToDownload = 3,
  Downloading = 4,
  QueuedToSeed = 5,
  Seeding = 6,
}

const statusToLabel = (status: TorrentStatus) => {
  switch (status) {
    case TorrentStatus.Stopped:
      return "Stopped";
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

/**
 * RPC spec is available at https://trac.transmissionbt.com/browser/trunk/extras/rpc-spec.txt
 */

export default function TorrentList() {
  const transmission = useMemo(
    () =>
      new Transmission({
        host: "10.0.0.27",
        port: 9091,
      }),
    []
  );
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
      {torrents.map((torrent) => (
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
        />
      ))}
    </List>
  );
}

function TorrentListItem({
  torrent,
  onStop,
  onStart,
}: {
  torrent: Torrent;
  onStop: (torrent: Torrent) => Promise<void>;
  onStart: (torrent: Torrent) => Promise<void>;
}) {
  return (
    <List.Item
      id={String(torrent.id)}
      key={torrent.id}
      title={torrent.fileName}
      subtitle={`${torrent.percentDone}% completed`}
      icon={Icon.Download}
      accessoryTitle={
        torrent.status === TorrentStatus.Downloading
          ? `${formatDistanceToNow(new Date(Date.now() + torrent.eta * 1000))} left`
          : statusToLabel(torrent.status)
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <ActionPanel.Item
              title={torrent.status === TorrentStatus.Stopped ? "Start" : "Stop"}
              onAction={() => (torrent.status === TorrentStatus.Stopped ? onStart(torrent) : onStop(torrent))}
            />
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
};
