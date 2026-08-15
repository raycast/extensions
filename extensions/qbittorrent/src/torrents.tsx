import {
  ActionPanel,
  Action,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  getPreferenceValues,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { QBittorrent, Torrent, TorrentFilters, TorrentState } from "@ctrl/qbittorrent";
import { filesize } from "filesize";
import { filterStates } from "./types/filterStates";
import { sentenceCase } from "change-case";
import { existsSync } from "node:fs";

enum TorrentActionType {
  RESUME,
  PAUSE,
  RECHECK,
  REANNOUNCE,
  DELETE,
  DELETE_INCLUDING_DATA,
}

const SHOW_DETAILS_KEY = "show-torrent-details";
const SORT_KEY = "torrent-sort";
const LIST_DETAILS_KEY = "torrent-list-details-v2";
const LOCAL_DOWNLOAD_FOLDER_KEY = "local-download-folder";
const copyMagnetLinkShortcut: Keyboard.Shortcut = {
  Windows: { modifiers: ["ctrl", "shift"], key: "c" },
  macOS: { modifiers: ["cmd", "shift"], key: "c" },
};
const toggleDetailsShortcut: Keyboard.Shortcut = {
  Windows: { modifiers: ["ctrl"], key: "d" },
  macOS: { modifiers: ["cmd"], key: "d" },
};
const sortOptions = [
  { title: "Name", field: "name" },
  { title: "Seeds", field: "num_seeds" },
  { title: "Peers", field: "num_leechs" },
  { title: "Down Speed", field: "dlspeed" },
  { title: "Up Speed", field: "upspeed" },
  { title: "ETA", field: "eta" },
  { title: "Ratio", field: "ratio" },
  { title: "Popularity", field: "popularity" },
  { title: "Category", field: "category" },
  { title: "Tags", field: "tags" },
] as const;

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

function formatEta(seconds: number) {
  if (!Number.isFinite(seconds) || seconds >= 8_640_000) {
    return "∞";
  }

  if (seconds < 60) {
    return `${Math.max(0, Math.round(seconds))}s`;
  }

  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);

  return [days && `${days}d`, hours && `${hours}h`, minutes && `${minutes}m`].filter(Boolean).slice(0, 2).join(" ");
}

function formatRatio(ratio: number) {
  return ratio === -1 || !Number.isFinite(ratio) ? "∞" : ratio.toFixed(2);
}

function formatPopularity(torrent: Torrent) {
  const activeMonths = torrent.time_active / 2_629_746;
  return formatRatio(activeMonths > 0 ? torrent.ratio / activeMonths : 0);
}

function formatTextAccessory(value: string | undefined, icon: Icon, tooltip: string): List.Item.Accessory | null {
  return value ? { tag: { value, color: Color.SecondaryText }, icon, tooltip } : null;
}

const listDetailOptions = [
  { title: "File Size", value: "size", accessory: formatSizeAccessory },
  {
    title: "Ratio",
    value: "ratio",
    accessory: (torrent: Torrent) => formatTextAccessory(formatRatio(torrent.ratio), Icon.Gauge, "Share ratio"),
  },
  {
    title: "Seeds",
    value: "seeds",
    accessory: (torrent: Torrent) =>
      formatTextAccessory(`${torrent.num_seeds} (${torrent.num_complete})`, Icon.TwoPeople, "Seeds connected (total)"),
  },
  {
    title: "Peers",
    value: "peers",
    accessory: (torrent: Torrent) =>
      formatTextAccessory(`${torrent.num_leechs} (${torrent.num_incomplete})`, Icon.Person, "Peers connected (total)"),
  },
  {
    title: "Download Speed",
    value: "downloadSpeed",
    accessory: (torrent: Torrent) => formatSpeedAccessory("Download", torrent.dlspeed, Color.Green, Icon.Download),
  },
  {
    title: "Upload Speed",
    value: "uploadSpeed",
    accessory: (torrent: Torrent) => formatSpeedAccessory("Upload", torrent.upspeed, Color.Blue, Icon.Upload),
  },
  {
    title: "ETA",
    value: "eta",
    accessory: (torrent: Torrent) => formatTextAccessory(formatEta(torrent.eta), Icon.Clock, "ETA"),
  },
  {
    title: "Popularity",
    value: "popularity",
    accessory: (torrent: Torrent) => formatTextAccessory(formatPopularity(torrent), Icon.Star, "Popularity"),
  },
  {
    title: "Category",
    value: "category",
    accessory: (torrent: Torrent) => formatTextAccessory(torrent.category, Icon.Folder, "Category"),
  },
  { title: "Tags", value: "tags", accessory: formatTagsAccessory },
] as const;
type ListDetail = (typeof listDetailOptions)[number]["value"];
const defaultListDetails: ListDetail[] = ["size", "downloadSpeed", "uploadSpeed", "tags"];

function formatListAccessories(torrent: Torrent, details: ListDetail[]) {
  return listDetailOptions
    .filter((option) => details.includes(option.value))
    .map((option) => option.accessory(torrent))
    .filter((accessory): accessory is List.Item.Accessory => accessory !== null);
}

function isLocalAddress(address: string) {
  try {
    return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(address).hostname);
  } catch {
    return false;
  }
}

function LocalDownloadFolderForm({ storageKey, savePath }: { storageKey: string; savePath: string }) {
  const { pop } = useNavigation();

  const saveFolder = async ({ folder }: { folder: string[] }) => {
    if (!folder[0]) {
      await showToast({ style: Toast.Style.Failure, title: "Choose a local folder" });
      return;
    }

    try {
      await LocalStorage.setItem(storageKey, folder[0]);
      await open(folder[0]);
      pop();
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Failed to use local folder" });
    }
  };

  return (
    <Form
      navigationTitle="Set Local Download Folder"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save and Open" onSubmit={saveFolder} />
        </ActionPanel>
      }
    >
      <Form.Description title="qBittorrent Folder" text={savePath} />
      <Form.FilePicker
        id="folder"
        title="Local Folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
    </Form>
  );
}

function TorrentDetail({ torrent }: { torrent: Torrent }) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Seeds" text={`${torrent.num_seeds} (${torrent.num_complete})`} />
          <List.Item.Detail.Metadata.Label title="Peers" text={`${torrent.num_leechs} (${torrent.num_incomplete})`} />
          <List.Item.Detail.Metadata.Label title="Down Speed" text={`${filesize(torrent.dlspeed)}/s`} />
          <List.Item.Detail.Metadata.Label title="Up Speed" text={`${filesize(torrent.upspeed)}/s`} />
          <List.Item.Detail.Metadata.Label title="ETA" text={formatEta(torrent.eta)} />
          <List.Item.Detail.Metadata.Label title="Ratio" text={formatRatio(torrent.ratio)} />
          <List.Item.Detail.Metadata.Label title="Popularity" text={formatPopularity(torrent)} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Category" text={torrent.category || "None"} />
          <List.Item.Detail.Metadata.Label title="Tags" text={torrent.tags || "None"} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default function Torrents() {
  const { push } = useNavigation();
  const [filter, setFilter] = useState<TorrentFilters>();
  const [torrents, setTorrents] = useState<Torrent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [listDetails, setListDetails] = useState<ListDetail[]>(defaultListDetails);
  const [sort, setSort] = useState<{ field?: string; reverse: boolean }>({ reverse: false });
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [updateTimestamp, setUpdateTimestamp] = useState(+new Date());
  const updateRequestRef = useRef(0);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { address, username, password, timeout } = getPreferenceValues<Preferences.Torrents>();

  const qbit = useMemo(() => {
    return new QBittorrent({
      baseUrl: address,
      username,
      password,
    });
  }, [address, username, password]);

  const openDownloadFolder = async (savePath: string) => {
    const storageKey = `${LOCAL_DOWNLOAD_FOLDER_KEY}:${address}:${savePath}`;

    try {
      const mappedPath = await LocalStorage.getItem<string>(storageKey);
      const target = mappedPath || (isLocalAddress(address) && existsSync(savePath) ? savePath : undefined);

      if (target && existsSync(target)) {
        await open(target);
        return;
      }
    } catch {
      // Fall through to folder selection.
    }

    push(<LocalDownloadFolderForm storageKey={storageKey} savePath={savePath} />);
  };

  const updateTorrents = async () => {
    const request = ++updateRequestRef.current;

    if (+timeout && updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    setLoading(true);
    try {
      await qbit.login();
      const torrents = await qbit.listTorrents({ filter, sort: sort.field, reverse: sort.reverse });
      if (request === updateRequestRef.current) {
        setTorrents(torrents);
      }
    } catch (error) {
      if (request === updateRequestRef.current) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to connect to qBittorrent",
          message: "Please check your Web UI settings and make sure qBittorrent is running.",
        });
        setTorrents([]);
      }
    } finally {
      if (request === updateRequestRef.current) {
        setLoading(false);
        if (+timeout) {
          updateTimeoutRef.current = setTimeout(() => {
            setUpdateTimestamp(+new Date());
          }, +timeout * 1000);
        }
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

  const toggleDetails = async () => {
    const nextValue = !isShowingDetail;
    setIsShowingDetail(nextValue);
    await LocalStorage.setItem(SHOW_DETAILS_KEY, nextValue);
  };

  const toggleListDetail = async (detail: ListDetail) => {
    const selected = new Set(listDetails);
    selected.has(detail) ? selected.delete(detail) : selected.add(detail);
    const nextDetails = listDetailOptions.map((option) => option.value).filter((value) => selected.has(value));

    setListDetails(nextDetails);
    await LocalStorage.setItem(LIST_DETAILS_KEY, nextDetails.join(","));
  };

  const selectSort = async (field?: string) => {
    const nextSort = field && sort.field === field ? { field, reverse: !sort.reverse } : { field, reverse: false };

    setSort(nextSort);
    await (field
      ? LocalStorage.setItem(SORT_KEY, `${field}:${nextSort.reverse ? "desc" : "asc"}`)
      : LocalStorage.removeItem(SORT_KEY));
  };

  useEffect(() => {
    Promise.all([
      LocalStorage.getItem<boolean>(SHOW_DETAILS_KEY),
      LocalStorage.getItem<string>(SORT_KEY),
      LocalStorage.getItem<string>(LIST_DETAILS_KEY),
    ])
      .then(([showDetails, storedSort, storedDetails]) => {
        setIsShowingDetail(showDetails ?? false);

        const [field, direction] = storedSort?.split(":") ?? [];
        if (field && sortOptions.some((option) => option.field === field)) {
          setSort({ field, reverse: direction === "desc" });
        }

        if (storedDetails !== undefined) {
          const selected = storedDetails.split(",");
          setListDetails(listDetailOptions.map((option) => option.value).filter((value) => selected.includes(value)));
        }
      })
      .finally(() => setPreferencesLoaded(true));
  }, []);

  useEffect(() => {
    if (preferencesLoaded) {
      updateTorrents();
    }
  }, [updateTimestamp, filter, sort, preferencesLoaded]);

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
      isShowingDetail={isShowingDetail}
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
            icon={formatProgressIcon(torrent)}
            title={torrent.name}
            subtitle={listDetails.includes("category") ? undefined : formatTorrentSubtitle(torrent)}
            key={torrent.hash}
            detail={<TorrentDetail torrent={torrent} />}
            accessories={formatListAccessories(torrent, listDetails)}
            actions={
              <ActionPanel>
                <Action
                  title="Open Download Folder"
                  icon={Icon.Folder}
                  onAction={() => openDownloadFolder(torrent.save_path)}
                />
                <Action.OpenInBrowser title="Open in Browser" url={address} />
                <Action.CopyToClipboard
                  title="Copy Save Path"
                  content={torrent.save_path}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action.CopyToClipboard
                  title="Copy Torrent Magnet Link"
                  content={torrent.magnet_uri}
                  shortcut={copyMagnetLinkShortcut}
                />
                <Action
                  icon={isShowingDetail ? Icon.EyeDisabled : Icon.AppWindowSidebarRight}
                  title={isShowingDetail ? "Hide Details" : "Show Details"}
                  shortcut={toggleDetailsShortcut}
                  onAction={toggleDetails}
                />
                <ActionPanel.Submenu icon={Icon.List} title="List Details">
                  {listDetailOptions.map((option) => (
                    <Action
                      key={option.value}
                      icon={listDetails.includes(option.value) ? Icon.CheckCircle : Icon.Circle}
                      title={option.title}
                      onAction={() => toggleListDetail(option.value)}
                    />
                  ))}
                </ActionPanel.Submenu>
                <ActionPanel.Submenu icon={sort.reverse ? Icon.ArrowDown : Icon.ArrowUp} title="Sort By">
                  <Action
                    icon={!sort.field ? Icon.CheckCircle : Icon.List}
                    title="Default Order"
                    onAction={() => selectSort()}
                  />
                  {sortOptions.map((option) => {
                    const isSelected = sort.field === option.field;

                    return (
                      <Action
                        key={option.field}
                        icon={isSelected ? (sort.reverse ? Icon.ArrowDown : Icon.ArrowUp) : undefined}
                        title={
                          isSelected ? `${option.title} (${sort.reverse ? "Descending" : "Ascending"})` : option.title
                        }
                        onAction={() => selectSort(option.field)}
                      />
                    );
                  })}
                </ActionPanel.Submenu>
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
