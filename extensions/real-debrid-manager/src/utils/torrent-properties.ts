import { Icon } from "@raycast/api";
import { TorrentStatus, UnrestrictLinkResponse } from "../schema";

export const formatProgress = (progress: number) => {
  if (!progress && progress !== 0) return "Unknown";
  if (progress === 100) return "Completed";

  return `${progress}%`;
};

export const isUnrestrictedTorrent = (response: UnrestrictLinkResponse) => {
  return Boolean(response?.id && response?.uri);
};

export const isUnrestrictedHosterLink = (response: UnrestrictLinkResponse) => {
  return Boolean(response?.id && response?.host);
};

export const isTorrentPendingFileSelection = (torrentStatus: TorrentStatus) => {
  return torrentStatus === "magnet_conversion" || torrentStatus === "waiting_files_selection";
};
export const isTorrentCompleted = (torrentStatus: TorrentStatus) => {
  return torrentStatus === "downloaded" || torrentStatus === "uploading";
};

type StatusMapValue = {
  title: string;
  icon: Icon;
};

export const TORRENT_STATUS_MAP: Record<TorrentStatus, StatusMapValue> = {
  waiting_files_selection: {
    title: "Pending file Selection",
    icon: Icon.BulletPoints,
  },
  compressing: {
    title: "Compressing",
    icon: Icon.Folder,
  },
  dead: {
    title: "Dead torrent",
    icon: Icon.Warning,
  },
  downloaded: {
    title: "Downloaded",
    icon: Icon.CheckCircle,
  },
  error: {
    title: "Error",
    icon: Icon.XMarkCircle,
  },
  magnet_error: {
    title: "Magnet error",
    icon: Icon.XMarkCircle,
  },
  downloading: {
    title: "Downloading",
    icon: Icon.CircleProgress,
  },
  queued: {
    title: "Queued",
    icon: Icon.Hourglass,
  },
  uploading: {
    title: "Uploading",
    icon: Icon.Cloud,
  },
  magnet_conversion: {
    title: "Converting Magnet",
    icon: Icon.BulletPoints,
  },
  virus: {
    title: "Virus found",
    icon: Icon.Bug,
  },
};
