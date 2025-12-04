import { ActionPanel, Action, List, getPreferenceValues, showToast, Toast, Icon, Keyboard } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { QBittorrent, Torrent, TorrentFilters, TorrentState } from "@ctrl/qbittorrent";
import { filesize } from "filesize";
import { filterStates } from "./types/filterStates";
import { sentenceCase } from "change-case";

const iconMap: Record<TorrentState, string | undefined> = {
  [TorrentState.Downloading]: "../assets/downloading.svg",
  [TorrentState.Uploading]: "../assets/uploading.svg",
  [TorrentState.Error]: "../assets/error.svg",
  [TorrentState.MissingFiles]: "../assets/error.svg",
  [TorrentState.PausedUP]: "../assets/completed.svg",
  [TorrentState.QueuedUP]: "../assets/stalledUP.svg",
  [TorrentState.StalledUP]: "../assets/stalledUP.svg",
  [TorrentState.CheckingUP]: "../assets/stalledUP.svg",
  [TorrentState.ForcedUP]: "../assets/stalledUP.svg",
  [TorrentState.Allocating]: "../assets/checking.svg",
  [TorrentState.MetaDL]: "../assets/downloading.svg",
  [TorrentState.PausedDL]: "../assets/paused.svg",
  [TorrentState.QueuedDL]: "../assets/stalledDL.svg",
  [TorrentState.StalledDL]: "../assets/stalledDL.svg",
  [TorrentState.CheckingDL]: "../assets/checking.svg",
  [TorrentState.ForcedDL]: "../assets/stalledDL.svg",
  [TorrentState.CheckingResumeData]: "../assets/checking.svg",
  [TorrentState.Moving]: "../assets/checking.svg",
  [TorrentState.StoppedDL]: "../assets/paused.svg",
  [TorrentState.StoppedUP]: "../assets/paused.svg",
  [TorrentState.ForcedMetaDL]: "../assets/downloading.svg",
  [TorrentState.QueuedForChecking]: "../assets/checking.svg",
  [TorrentState.Unknown]: undefined,
};

enum TorrentActionType {
  RESUME,
  PAUSE,
  DELETE,
  DELETE_INCLUDING_DATA,
}

export default function Torrents() {
  const [filter, setFilter] = useState<TorrentFilters>();
  const [torrents, setTorrents] = useState<Torrent[]>([]);
  const [loading, setLoading] = useState(true);
  const [updateTimestamp, setUpdateTimestamp] = useState(+new Date());
  let updateTimeout: NodeJS.Timeout;

  const { address, username, password, timeout } = getPreferenceValues<Preferences.Torrents>();

  const qbit = useMemo(() => {
    return new QBittorrent({
      baseUrl: address,
      username,
      password,
    });
  }, [address, username, password]);

  const updateTorrents = async () => {
    +timeout && updateTimeout && clearTimeout(updateTimeout);
    setLoading(true);
    try {
      await qbit.login();
      const torrents = await qbit.listTorrents({ filter });
      setTorrents(torrents);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to connect to qBittorrent",
        message: "Please check your Web UI settings and make sure qBittorrent is running.",
      });
      setTorrents([]);
    } finally {
      setLoading(false);
      if (+timeout) {
        updateTimeout = setTimeout(() => {
          setUpdateTimestamp(+new Date());
        }, +timeout * 1000);
      }
    }
  };

  const torrentAction = async (actionType: TorrentActionType, hash: string) => {
    try {
      switch (actionType) {
        case TorrentActionType.RESUME:
          await qbit.resumeTorrent(hash);
          break;
        case TorrentActionType.PAUSE:
          await qbit.pauseTorrent(hash);
          break;
        case TorrentActionType.DELETE:
          await qbit.removeTorrent(hash);
          break;
        case TorrentActionType.DELETE_INCLUDING_DATA:
          await qbit.removeTorrent(hash, true);
          break;
        default:
          break;
      }
      await updateTorrents();
    } catch (error) {
      console.log(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
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
      filtering
      searchBarPlaceholder="Search your torrents"
      searchBarAccessory={
        <List.Dropdown
          value={filter}
          tooltip="Filter by state"
          onChange={(newFilter) => {
            setFilter(newFilter as TorrentFilters);
          }}
        >
          {filterStates.map((key) => (
            <List.Dropdown.Item title={sentenceCase(key)} value={key} key={key} />
          ))}
        </List.Dropdown>
      }
    >
      {torrents.map((torrent) => {
        return (
          <List.Item
            icon={iconMap[torrent.state]}
            title={`${torrent.name} (${filesize(torrent.size)})`}
            key={torrent.hash}
            accessories={[
              {
                text: `↑${filesize(torrent.upspeed)}/s`,
              },
              {
                text: `↓${filesize(torrent.dlspeed)}/s`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Torrent Magnet Link" content={torrent.magnet_uri} />
                <Action
                  icon={Icon.Play}
                  title="Resume Torrent"
                  onAction={() => torrentAction(TorrentActionType.RESUME, torrent.hash)}
                />
                <Action
                  icon={Icon.Pause}
                  title="Pause Torrent"
                  onAction={() => torrentAction(TorrentActionType.PAUSE, torrent.hash)}
                />
                <ActionPanel.Submenu
                  icon={Icon.Trash}
                  title="Delete Torrent"
                  shortcut={Keyboard.Shortcut.Common.Remove}
                >
                  <Action
                    icon={Icon.Trash}
                    title="Keep local data"
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => torrentAction(TorrentActionType.DELETE, torrent.hash)}
                  />
                  <Action
                    icon={Icon.Trash}
                    title="Delete local data"
                    shortcut={Keyboard.Shortcut.Common.RemoveAll}
                    style={Action.Style.Destructive}
                    onAction={() => torrentAction(TorrentActionType.DELETE_INCLUDING_DATA, torrent.hash)}
                  />
                </ActionPanel.Submenu>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
