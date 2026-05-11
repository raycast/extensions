import { ActionPanel, Action, Color, Icon, Keyboard, List, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { QBittorrent, Torrent, TorrentFilters, TorrentState } from "@ctrl/qbittorrent";
import { filesize } from "filesize";
import { filterStates } from "./types/filterStates";
import { sentenceCase } from "change-case";

enum TorrentActionType {
  RESUME,
  PAUSE,
  RECHECK,
  REANNOUNCE,
  DELETE,
  DELETE_INCLUDING_DATA,
}

function getProgressIcon(progress: number) {
  if (progress >= 1) {
    return Icon.CircleProgress100;
  }

  if (progress >= 0.75) {
    return Icon.CircleProgress75;
  }

  if (progress >= 0.5) {
    return Icon.CircleProgress50;
  }

  if (progress >= 0.25) {
    return Icon.CircleProgress25;
  }

  return Icon.CircleProgress;
}

function getProgressColor(state: TorrentState) {
  switch (state) {
    case TorrentState.Downloading:
    case TorrentState.MetaDL:
    case TorrentState.ForcedDL:
    case TorrentState.ForcedMetaDL:
      return Color.Green;
    case TorrentState.Uploading:
    case TorrentState.ForcedUP:
    case TorrentState.PausedUP:
    case TorrentState.StalledUP:
    case TorrentState.QueuedUP:
    case TorrentState.CheckingUP:
      return Color.Blue;
    case TorrentState.Error:
    case TorrentState.MissingFiles:
      return Color.Red;
    case TorrentState.Allocating:
    case TorrentState.CheckingDL:
    case TorrentState.CheckingResumeData:
    case TorrentState.Moving:
    case TorrentState.QueuedDL:
    case TorrentState.QueuedForChecking:
    case TorrentState.StalledDL:
      return Color.Orange;
    case TorrentState.PausedDL:
    case TorrentState.StoppedDL:
    case TorrentState.StoppedUP:
    case TorrentState.Unknown:
    default:
      return Color.SecondaryText;
  }
}

function formatProgressTooltip(torrent: Torrent) {
  const progressPercent = Math.round(torrent.progress * 100);
  const completedSize = filesize(Math.round(torrent.size * torrent.progress));

  return `${progressPercent}% • ${completedSize} of ${filesize(torrent.size)}`;
}

function formatProgressIcon(torrent: Torrent) {
  return {
    value: {
      source: getProgressIcon(torrent.progress),
      tintColor: getProgressColor(torrent.state),
    },
    tooltip: formatProgressTooltip(torrent),
  };
}

function formatTorrentSubtitle(torrent: Torrent) {
  return torrent.category || undefined;
}

function formatSizeAccessory(torrent: Torrent): List.Item.Accessory {
  return {
    tag: { value: filesize(torrent.size), color: Color.SecondaryText },
    icon: Icon.HardDrive,
    tooltip: "Total size",
  };
}

function formatTagsAccessory(torrent: Torrent): List.Item.Accessory | null {
  const tags = torrent.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  if (!tags.length) {
    return null;
  }

  const label = tags.length === 1 ? tags[0] : `${tags[0]} +${tags.length - 1}`;

  return {
    tag: { value: label, color: Color.SecondaryText },
    icon: Icon.Tag,
    tooltip: tags.join(", "),
  };
}

function formatSpeedAccessory(
  label: "Download" | "Upload",
  speed: number,
  color: Color,
  icon: Icon,
): List.Item.Accessory {
  return {
    tag: {
      value: `${filesize(speed)}/s`,
      color: speed > 0 ? color : undefined,
    },
    icon: { source: icon, tintColor: speed > 0 ? color : Color.SecondaryText },
    tooltip: `${label} speed`,
  };
}

export default function Torrents() {
  const [filter, setFilter] = useState<TorrentFilters>();
  const [torrents, setTorrents] = useState<Torrent[]>([]);
  const [loading, setLoading] = useState(true);
  const [updateTimestamp, setUpdateTimestamp] = useState(+new Date());
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { address, username, password, timeout } = getPreferenceValues<Preferences.Torrents>();

  const qbit = useMemo(() => {
    return new QBittorrent({
      baseUrl: address,
      username,
      password,
    });
  }, [address, username, password]);

  const updateTorrents = async () => {
    if (+timeout && updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

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
        updateTimeoutRef.current = setTimeout(() => {
          setUpdateTimestamp(+new Date());
        }, +timeout * 1000);
      }
    }
  };

  const torrentAction = async (actionType: TorrentActionType, hash: string) => {
    try {
      switch (actionType) {
        case TorrentActionType.RESUME:
          await qbit.startTorrent(hash);
          break;
        case TorrentActionType.PAUSE:
          await qbit.stopTorrent(hash);
          break;
        case TorrentActionType.RECHECK:
          await qbit.recheckTorrent(hash);
          break;
        case TorrentActionType.REANNOUNCE:
          await qbit.reannounceTorrent(hash);
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

  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

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
        const tagsAccessory = formatTagsAccessory(torrent);

        return (
          <List.Item
            icon={formatProgressIcon(torrent)}
            title={torrent.name}
            subtitle={formatTorrentSubtitle(torrent)}
            key={torrent.hash}
            accessories={[
              formatSizeAccessory(torrent),
              ...(tagsAccessory ? [tagsAccessory] : []),
              formatSpeedAccessory("Download", torrent.dlspeed, Color.Green, Icon.Download),
              formatSpeedAccessory("Upload", torrent.upspeed, Color.Blue, Icon.Upload),
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Torrent Magnet Link" content={torrent.magnet_uri} />
                <Action.CopyToClipboard title="Copy Save Path" content={torrent.save_path} />
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
                <Action
                  icon={Icon.ArrowClockwise}
                  title="Recheck Torrent"
                  onAction={() => torrentAction(TorrentActionType.RECHECK, torrent.hash)}
                />
                <Action
                  icon={Icon.Globe}
                  title="Reannounce Torrent"
                  onAction={() => torrentAction(TorrentActionType.REANNOUNCE, torrent.hash)}
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
