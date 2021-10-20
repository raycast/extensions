import { List, showToast, ToastStyle, Icon } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import Transmission from "transmission-promise";
import { formatDistanceToNow } from "date-fns";

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
  const [activeTorrents, setActiveTorrents] = useState<Torrent[]>([]);

  useEffect(() => {
    async function fetch() {
      const torrents = await fetchTorrents(transmission);
      setActiveTorrents(torrents);
    }
    fetch();
  }, []);

  return (
    <List isLoading={activeTorrents.length === 0} searchBarPlaceholder="Filter torrents by name...">
      {activeTorrents.map((torrent) => (
        <TorrentListItem key={torrent.id} torrent={torrent} />
      ))}
    </List>
  );
}

function TorrentListItem({ torrent }: { torrent: Torrent }) {
  return (
    <List.Item
      id={torrent.id}
      key={torrent.id}
      title={torrent.comment}
      subtitle={`${torrent.percentDone}% completed`}
      icon={Icon.Download}
      accessoryTitle={`${formatDistanceToNow(new Date(Date.now() + torrent.eta * 1000))} left`}
    />
  );
}

async function fetchTorrents(transmission: Transmission): Promise<Torrent[]> {
  try {
    const response = await transmission.active();
    return response.torrents;
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Could not load torrents");
    return Promise.resolve([]);
  }
}

type Torrent = {
  id: string;
  comment: string;
  eta: number;
  percentDone: number;
};
