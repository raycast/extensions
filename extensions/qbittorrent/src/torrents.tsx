import { ActionPanel, Action, List, getPreferenceValues, showToast, Toast, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { QBittorrent, prettySize, RawTorrent, RawTorrentListFilter, RawTorrentState } from "qbit.js";

interface Preferences {
  address: string;
  username: string;
  password: string;
  timeout: number;
}
const iconMap = {
  [RawTorrentState.downloading]: "../assets/downloading.svg",
  [RawTorrentState.uploading]: "../assets/uploading.svg",
  [RawTorrentState.error]: "../assets/error.svg",
  [RawTorrentState.missingFiles]: "../assets/error.svg",
  [RawTorrentState.pausedUP]: "../assets/completed.svg",
  [RawTorrentState.queuedUP]: "../assets/stalledUP.svg",
  [RawTorrentState.stalledUP]: "../assets/stalledUP.svg",
  [RawTorrentState.checkingUP]: "../assets/stalledUP.svg",
  [RawTorrentState.forcedUP]: "../assets/stalledUP.svg",
  [RawTorrentState.allocating]: "../assets/checking.svg",
  [RawTorrentState.metaDL]: "../assets/downloading.svg",
  [RawTorrentState.pausedDL]: "../assets/paused.svg",
  [RawTorrentState.queuedDL]: "../assets/stalledDL.svg",
  [RawTorrentState.stalledDL]: "../assets/stalledDL.svg",
  [RawTorrentState.checkingDL]: "../assets/checking.svg",
  [RawTorrentState.forcedDL]: "../assets/stalledDL.svg",
  [RawTorrentState.checkingResumeData]: "../assets/checking.svg",
  [RawTorrentState.moving]: "../assets/checking.svg",
  [RawTorrentState.unknown]: undefined,
};

enum TorrentActionType {
  RESUME,
  PAUSE,
  DELETE,
}

export default function Torrents() {
  const [filter, setFilter] = useState<RawTorrentListFilter>();
  const [torrents, setTorrents] = useState<RawTorrent[]>([]);
  const [loading, setLoading] = useState(true);
  const [updateTimestamp, setUpdateTimestamp] = useState(+new Date());
  let updateTimeout: NodeJS.Timeout;

  const { address, username, password, timeout } = getPreferenceValues<Preferences>();

  const updateTorrents = async () => {
    const qbit = new QBittorrent(address);
    +timeout && updateTimeout && clearTimeout(updateTimeout);
    setLoading(true);
    try {
      await qbit.login(username, password);
      const torrents = await qbit.api.getTorrents({ filter });
      setTorrents(torrents);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load torrents",
        message: "Please check your preferences.",
      });
    }
    setLoading(false);
    if (+timeout) {
      updateTimeout = setTimeout(() => {
        setUpdateTimestamp(+new Date());
      }, +timeout * 1000);
    }
  };

  const torrentAction = async (actionType: TorrentActionType, hash: string) => {
    try {
      const qbit = new QBittorrent(address);
      await qbit.login(username, password);
      switch (actionType) {
        case TorrentActionType.RESUME:
          await qbit.api.resumeTorrents(hash);
          break;
        case TorrentActionType.PAUSE:
          await qbit.api.pauseTorrents(hash);
          break;
        case TorrentActionType.DELETE:
          await qbit.api.deleteTorrents(hash);
          break;
        default:
          break;
      }
      await updateTorrents();
    } catch (error) {
      console.log(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Somethong wrong",
        message: "Please try again later.",
      });
    }
  };

  useEffect(() => {
    updateTorrents();
  }, [updateTimestamp, filter]);

  return (
    <List
      isLoading={loading}
      enableFiltering
      searchBarPlaceholder="Search your torrents"
      searchBarAccessory={
        <List.Dropdown
          value={filter}
          tooltip="Filter by state"
          onChange={(newFilter) => {
            setFilter(newFilter as RawTorrentListFilter);
          }}
        >
          {Object.keys(RawTorrentListFilter).map((key) => (
            <List.Dropdown.Item title={key} value={key} key={key} />
          ))}
        </List.Dropdown>
      }
    >
      {torrents.map((torrent) => {
        return (
          <List.Item
            icon={iconMap[torrent.state]}
            title={`${torrent.name} (${prettySize(torrent.size)})`}
            key={torrent.infohash_v1}
            accessories={[
              {
                text: `↑${prettySize(torrent.upspeed)}/s`,
              },
              {
                text: `↓${prettySize(torrent.dlspeed)}/s`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Torrent Magnet Link" content={torrent.magnet_uri} />
                <Action
                  icon="../assets/resumed.svg"
                  title="Resume Torrent"
                  onAction={() => torrentAction(TorrentActionType.RESUME, torrent.infohash_v1)}
                />
                <Action
                  icon="../assets/paused.svg"
                  title="Pause Torrent"
                  onAction={() => torrentAction(TorrentActionType.PAUSE, torrent.infohash_v1)}
                />
                <Action
                  icon={Icon.Trash}
                  title="Delete Torrent"
                  onAction={() => torrentAction(TorrentActionType.DELETE, torrent.infohash_v1)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
