import { Color, Icon } from "@raycast/api";
import { TorrentStatus } from "../schema";

export const formatProgress = (progress: number) => {
  if (!progress && progress !== 0) return "Unknown";
  if (progress === 100) return "Completed";

  return `${progress}%`;
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
  color: Color;
};

export const TORRENT_STATUS_MAP: Record<TorrentStatus, StatusMapValue> = {
  waiting_files_selection: {
    title: "Pending file Selection",
    icon: Icon.BulletPoints,
    color: Color.Yellow,
  },
  compressing: {
    title: "Compressing",
    icon: Icon.Folder,
    color: Color.Yellow,
  },
  dead: {
    title: "Dead torrent",
    icon: Icon.Warning,
    color: Color.Red,
  },
  downloaded: {
    title: "Downloaded",
    icon: Icon.CheckCircle,
    color: Color.Green,
  },
  error: {
    title: "Error",
    icon: Icon.XMarkCircle,
    color: Color.Red,
  },
  magnet_error: {
    title: "Magnet error",
    icon: Icon.XMarkCircle,
    color: Color.Red,
  },
  downloading: {
    title: "Downloading",
    icon: Icon.CircleProgress,
    color: Color.Blue,
  },
  queued: {
    title: "Queued",
    icon: Icon.Hourglass,
    color: Color.Yellow,
  },
  uploading: {
    title: "Uploading",
    icon: Icon.Cloud,
    color: Color.Yellow,
  },
  magnet_conversion: {
    title: "Converting Magnet",
    icon: Icon.BulletPoints,
    color: Color.Yellow,
  },
  virus: {
    title: "Virus found",
    icon: Icon.Bug,
    color: Color.Red,
  },
};
